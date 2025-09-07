import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface Project {
  id: string;
  name: string;
  domain: string;
  repository: string;
  branch: string;
  buildCommand?: string;
  startCommand?: string;
  environment: Record<string, string>;
  port: number;
  status: 'deploying' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  updatedAt: Date;
  lastDeployed?: Date;
}

export class ProjectService {
  private projectsDir = '/app/projects';
  private redis = getRedisClient();

  constructor() {
    this.ensureProjectsDirectory();
  }

  private async ensureProjectsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create projects directory:', error);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await this.redis.hGetAll('projects');
      return Object.values(projects).map(project => JSON.parse(project));
    } catch (error) {
      logger.error('Failed to get all projects:', error);
      return [];
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const projectData = await this.redis.hGet('projects', id);
      return projectData ? JSON.parse(projectData) : null;
    } catch (error) {
      logger.error('Failed to get project by ID:', error);
      return null;
    }
  }

  async deployProject(projectData: Omit<Project, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = this.generateProjectId(projectData.name);
    const project: Project = {
      ...projectData,
      id,
      status: 'deploying',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastDeployed: new Date()
    };

    try {
      // Store project in Redis
      await this.redis.hSet('projects', id, JSON.stringify(project));

      // Clone repository
      await this.cloneRepository(project);

      // Build project if build command exists
      if (project.buildCommand) {
        await this.buildProject(project);
      }

      // Create Docker Compose file for the project
      await this.createProjectCompose(project);

      // Start the project
      await this.startProject(project);

      // Update project status
      project.status = 'running';
      project.updatedAt = new Date();
      await this.redis.hSet('projects', id, JSON.stringify(project));

      logger.info(`Project deployed successfully: ${project.name}`);
      return project;

    } catch (error) {
      logger.error('Failed to deploy project:', error);
      project.status = 'error';
      project.updatedAt = new Date();
      await this.redis.hSet('projects', id, JSON.stringify(project));
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const project = await this.getProjectById(id);
      if (!project) return null;

      const updatedProject = {
        ...project,
        ...updates,
        updatedAt: new Date()
      };

      await this.redis.hSet('projects', id, JSON.stringify(updatedProject));
      return updatedProject;
    } catch (error) {
      logger.error('Failed to update project:', error);
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      // Stop the project
      await this.stopProject(project);

      // Remove project directory
      const projectPath = path.join(this.projectsDir, project.name);
      await fs.rm(projectPath, { recursive: true, force: true });

      // Remove from Redis
      await this.redis.hDel('projects', id);

      logger.info(`Project deleted: ${project.name}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete project:', error);
      return false;
    }
  }

  async restartProject(id: string): Promise<boolean> {
    try {
      const project = await this.getProjectById(id);
      if (!project) return false;

      await this.stopProject(project);
      await this.startProject(project);

      project.status = 'running';
      project.updatedAt = new Date();
      await this.redis.hSet('projects', id, JSON.stringify(project));

      return true;
    } catch (error) {
      logger.error('Failed to restart project:', error);
      return false;
    }
  }

  async getProjectLogs(id: string, lines: number = 100): Promise<string[] | null> {
    try {
      const project = await this.getProjectById(id);
      if (!project) return null;

      const { stdout } = await execAsync(
        `docker compose -f ${path.join(this.projectsDir, project.name, 'compose.yaml')} logs --tail=${lines}`
      );

      return stdout.split('\n').filter(line => line.trim());
    } catch (error) {
      logger.error('Failed to get project logs:', error);
      return null;
    }
  }

  async getProjectStatus(id: string): Promise<any> {
    try {
      const project = await this.getProjectById(id);
      if (!project) return null;

      const { stdout } = await execAsync(
        `docker compose -f ${path.join(this.projectsDir, project.name, 'compose.yaml')} ps --format json`
      );

      const containers = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      return {
        project,
        containers,
        status: project.status,
        uptime: project.lastDeployed ? Date.now() - project.lastDeployed.getTime() : 0
      };
    } catch (error) {
      logger.error('Failed to get project status:', error);
      return null;
    }
  }

  private generateProjectId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
  }

  private async cloneRepository(project: Project): Promise<void> {
    const projectPath = path.join(this.projectsDir, project.name);
    
    try {
      await fs.mkdir(projectPath, { recursive: true });
      await execAsync(`git clone -b ${project.branch} ${project.repository} ${projectPath}`);
      logger.info(`Repository cloned: ${project.repository}`);
    } catch (error) {
      logger.error('Failed to clone repository:', error);
      throw error;
    }
  }

  private async buildProject(project: Project): Promise<void> {
    const projectPath = path.join(this.projectsDir, project.name);
    
    try {
      await execAsync(`cd ${projectPath} && ${project.buildCommand}`);
      logger.info(`Project built: ${project.name}`);
    } catch (error) {
      logger.error('Failed to build project:', error);
      throw error;
    }
  }

  private async createProjectCompose(project: Project): Promise<void> {
    const projectPath = path.join(this.projectsDir, project.name);
    const composePath = path.join(projectPath, 'compose.yaml');

    const composeContent = this.generateComposeContent(project);
    await fs.writeFile(composePath, composeContent);
  }

  private generateComposeContent(project: Project): string {
    return `version: '3.8'

services:
  ${project.name}:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/arm64
    container_name: ${project.name}
    restart: unless-stopped
    ports:
      - "${project.port}:${project.port}"
    environment:
      ${Object.entries(project.environment).map(([key, value]) => `- ${key}=${value}`).join('\n      ')}
    volumes:
      - ./logs:/app/logs
    networks:
      - pi-network

networks:
  pi-network:
    external: true
`;
  }

  private async startProject(project: Project): Promise<void> {
    const projectPath = path.join(this.projectsDir, project.name);
    
    try {
      await execAsync(`cd ${projectPath} && docker compose up -d`);
      logger.info(`Project started: ${project.name}`);
    } catch (error) {
      logger.error('Failed to start project:', error);
      throw error;
    }
  }

  private async stopProject(project: Project): Promise<void> {
    const projectPath = path.join(this.projectsDir, project.name);
    
    try {
      await execAsync(`cd ${projectPath} && docker compose down`);
      logger.info(`Project stopped: ${project.name}`);
    } catch (error) {
      logger.error('Failed to stop project:', error);
      throw error;
    }
  }
}