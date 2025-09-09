import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import toast from 'react-hot-toast';
import { 
  Container, 
  Image, 
  Network, 
  HardDrive, 
  Trash2, 
  RefreshCw,
  Play,
  Square,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const DockerManagement = () => {
  const [activeTab, setActiveTab] = useState('containers');
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'containers':
          const containersRes = await apiClient.get('/docker/containers');
          setContainers(containersRes.data.data || []);
          break;
        case 'images':
          const imagesRes = await apiClient.get('/docker/images');
          setImages(imagesRes.data.data || []);
          break;
        case 'networks':
          const networksRes = await apiClient.get('/docker/networks');
          setNetworks(networksRes.data.data || []);
          break;
        case 'volumes':
          const volumesRes = await axios.get('/api/docker/volumes');
          setVolumes(volumesRes.data.data || []);
          break;
        case 'info':
          const infoRes = await axios.get('/api/docker/info');
          setSystemInfo(infoRes.data.data);
          break;
      }
    } catch (error) {
      toast.error(`Failed to fetch ${activeTab} data`);
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to remove this image?')) return;
    
    try {
      await apiClient.delete(`/docker/images/${imageId}`);
      toast.success('Image removed successfully');
      fetchData();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove image';
      toast.error(errorMessage);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return <CheckCircle size={16} color="#28a745" />;
      case 'exited':
        return <XCircle size={16} color="#dc3545" />;
      case 'created':
        return <AlertCircle size={16} color="#ffc107" />;
      default:
        return <AlertCircle size={16} color="#6c757d" />;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const tabs = [
    { id: 'containers', label: 'Containers', icon: Container },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'networks', label: 'Networks', icon: Network },
    { id: 'volumes', label: 'Volumes', icon: HardDrive },
    { id: 'info', label: 'System Info', icon: Info }
  ];

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Container size={24} />
            Docker Management
          </h1>
          <button
            onClick={fetchData}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: activeTab === tab.id ? '#007bff' : '#f8f9fa',
                  color: activeTab === tab.id ? 'white' : '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500'
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
            <p>Loading {activeTab}...</p>
          </div>
        ) : (
          <>
            {/* Containers */}
            {activeTab === 'containers' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Image</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Ports</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr key={container.ID} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '15px', fontWeight: '500' }}>
                          {container.Names?.[0]?.replace('/', '') || 'Unknown'}
                        </td>
                        <td style={{ padding: '15px' }}>
                          {container.Image}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getStatusIcon(container.State)}
                            <span style={{ textTransform: 'capitalize' }}>{container.State}</span>
                          </div>
                        </td>
                        <td style={{ padding: '15px' }}>
                          {container.Ports?.map(port => `${port.PrivatePort}:${port.PublicPort}`).join(', ') || 'None'}
                        </td>
                        <td style={{ padding: '15px', color: '#666' }}>
                          {formatDate(container.CreatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {containers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <Container size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No containers found</p>
                  </div>
                )}
              </div>
            )}

            {/* Images */}
            {activeTab === 'images' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Repository</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Tag</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Image ID</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Size</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                      <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {images.map((image) => (
                      <tr key={image.ID} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '15px', fontWeight: '500' }}>
                          {image.Repository || 'Unknown'}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#e9ecef',
                            color: '#495057'
                          }}>
                            {image.Tag || 'latest'}
                          </span>
                        </td>
                        <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                          {image.ID?.substring(0, 12)}
                        </td>
                        <td style={{ padding: '15px' }}>
                          {formatBytes(image.Size)}
                        </td>
                        <td style={{ padding: '15px', color: '#666' }}>
                          {formatDate(image.CreatedAt)}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveImage(image.ID)}
                            style={{
                              padding: '8px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Remove Image"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {images.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <Image size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No images found</p>
                  </div>
                )}
              </div>
            )}

            {/* Networks */}
            {activeTab === 'networks' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Driver</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Scope</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networks.map((network) => (
                      <tr key={network.ID} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '15px', fontWeight: '500' }}>
                          {network.Name}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#e9ecef',
                            color: '#495057'
                          }}>
                            {network.Driver}
                          </span>
                        </td>
                        <td style={{ padding: '15px' }}>
                          {network.Scope}
                        </td>
                        <td style={{ padding: '15px', color: '#666' }}>
                          {formatDate(network.Created)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {networks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <Network size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No networks found</p>
                  </div>
                )}
              </div>
            )}

            {/* Volumes */}
            {activeTab === 'volumes' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Driver</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Mountpoint</th>
                      <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumes.map((volume) => (
                      <tr key={volume.Name} style={{ borderBottom: '1px solid #f1f3f4' }}>
                        <td style={{ padding: '15px', fontWeight: '500' }}>
                          {volume.Name}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            background: '#e9ecef',
                            color: '#495057'
                          }}>
                            {volume.Driver}
                          </span>
                        </td>
                        <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                          {volume.Mountpoint}
                        </td>
                        <td style={{ padding: '15px', color: '#666' }}>
                          {formatDate(volume.CreatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {volumes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <HardDrive size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No volumes found</p>
                  </div>
                )}
              </div>
            )}

            {/* System Info */}
            {activeTab === 'info' && systemInfo && (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ margin: '0 0 15px 0' }}>Docker System Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    <div>
                      <strong>Docker Version:</strong> {systemInfo.ServerVersion}
                    </div>
                    <div>
                      <strong>API Version:</strong> {systemInfo.ApiVersion}
                    </div>
                    <div>
                      <strong>Go Version:</strong> {systemInfo.GoVersion}
                    </div>
                    <div>
                      <strong>OS:</strong> {systemInfo.Os}
                    </div>
                    <div>
                      <strong>Architecture:</strong> {systemInfo.Arch}
                    </div>
                    <div>
                      <strong>Kernel Version:</strong> {systemInfo.KernelVersion}
                    </div>
                    <div>
                      <strong>Containers:</strong> {systemInfo.Containers}
                    </div>
                    <div>
                      <strong>Images:</strong> {systemInfo.Images}
                    </div>
                    <div>
                      <strong>Driver:</strong> {systemInfo.Driver}
                    </div>
                    <div>
                      <strong>Storage Driver:</strong> {systemInfo.Driver}
                    </div>
                  </div>
                </div>

                {systemInfo.MemoryLimit && (
                  <div className="card">
                    <h3 style={{ margin: '0 0 15px 0' }}>Memory Information</h3>
                    <div>
                      <strong>Memory Limit:</strong> {formatBytes(systemInfo.MemoryLimit)}
                    </div>
                    <div>
                      <strong>Swap Limit:</strong> {formatBytes(systemInfo.SwapLimit)}
                    </div>
                  </div>
                )}

                {systemInfo.CpuCfsPeriod && (
                  <div className="card">
                    <h3 style={{ margin: '0 0 15px 0' }}>CPU Information</h3>
                    <div>
                      <strong>CPU CFS Period:</strong> {systemInfo.CpuCfsPeriod}
                    </div>
                    <div>
                      <strong>CPU CFS Quota:</strong> {systemInfo.CpuCfsQuota}
                    </div>
                    <div>
                      <strong>CPU Shares:</strong> {systemInfo.CpuShares}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DockerManagement;