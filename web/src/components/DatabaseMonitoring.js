import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { 
  Database, 
  RefreshCw, 
  HardDrive,
  Users,
  Clock,
  Activity,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const DatabaseMonitoring = () => {
  const [dbData, setDbData] = useState(null);
  const [redisData, setRedisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDatabaseInfo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/health');
      
      if (response.data.success) {
        setDbData(response.data.services.database);
        setRedisData(response.data.services.redis);
        setLastUpdated(new Date());
      } else {
        toast.error('Failed to fetch database information');
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
      toast.error('Failed to fetch database information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDatabaseInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusIcon = (connected) => {
    if (connected) {
      return <CheckCircle size={16} className="text-green-600" />;
    }
    return <XCircle size={16} className="text-red-600" />;
  };

  const getStatusColor = (connected) => {
    return connected ? 'text-green-600' : 'text-red-600';
  };

  if (loading && !dbData) {
    return (
      <div className="card">
        <div className="text-center">
          <div className="spinner"></div>
          <p>Loading database information...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2>Database Monitoring</h2>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchDatabaseInfo}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-2 gap-6">
          {/* MongoDB Status */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Database size={20} className="text-blue-600" />
              <h3>MongoDB</h3>
              {getStatusIcon(dbData?.connected)}
            </div>

            {dbData?.connected ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${getStatusColor(dbData.connected)}`}>
                    {dbData.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Environment</span>
                  <span className="text-sm font-medium">{dbData.environment}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Collections</span>
                  <span className="text-sm font-medium">{dbData.collections}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Documents</span>
                  <span className="text-sm font-medium">{dbData.documents}</span>
                </div>

                {dbData.collectionStats && Object.keys(dbData.collectionStats).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Collection Details</h4>
                    <div className="space-y-1">
                      {Object.entries(dbData.collectionStats).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">{name}</span>
                          <span className="font-medium">{count} docs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dbData.databaseSize && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Database Size</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Data Size</span>
                        <span className="font-medium">{formatBytes(dbData.databaseSize.dataSize)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Storage Size</span>
                        <span className="font-medium">{formatBytes(dbData.databaseSize.storageSize)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Index Size</span>
                        <span className="font-medium">{formatBytes(dbData.databaseSize.indexSize)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">
                  {dbData?.error || 'MongoDB not connected'}
                </p>
              </div>
            )}
          </div>

          {/* Redis Status */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Server size={20} className="text-red-600" />
              <h3>Redis</h3>
              {getStatusIcon(redisData?.connected)}
            </div>

            {redisData?.connected ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${getStatusColor(redisData.connected)}`}>
                    {redisData.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Environment</span>
                  <span className="text-sm font-medium">{redisData.environment}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Version</span>
                  <span className="text-sm font-medium">{redisData.redisVersion}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Connected Clients</span>
                  <span className="text-sm font-medium">{redisData.connectedClients}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Key Count</span>
                  <span className="text-sm font-medium">{redisData.keyCount}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Memory Used</span>
                  <span className="text-sm font-medium">{redisData.memoryUsed}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Memory Peak</span>
                  <span className="text-sm font-medium">{redisData.memoryPeak}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="text-sm font-medium">{formatUptime(redisData.uptimeSeconds)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">
                  {redisData?.error || 'Redis not connected'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="grid grid-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Database size={24} className="text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {dbData?.collections || 0}
              </div>
              <div className="text-sm text-gray-600">Collections</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users size={24} className="text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {dbData?.documents || 0}
              </div>
              <div className="text-sm text-gray-600">Documents</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Activity size={24} className="text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">
                {redisData?.keyCount || 0}
              </div>
              <div className="text-sm text-gray-600">Redis Keys</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Clock size={24} className="text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {redisData?.connectedClients || 0}
              </div>
              <div className="text-sm text-gray-600">Active Clients</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMonitoring;