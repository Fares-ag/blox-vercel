import React, { useState, useRef } from 'react';
import { Box, Typography, Paper, Button, Alert, Divider } from '@mui/material';
import { DeleteForever, Refresh, Download, Upload } from '@mui/icons-material';
import { clearAllStorage, clearCustomerStorage, clearApplicationData, getStorageInfo, downloadStorage, restoreStorage } from '@shared/utils/storage.util';
import { toast } from 'react-toastify';
import './ClearStoragePage.scss';

export const ClearStoragePage: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshInfo = () => {
    setStorageInfo(getStorageInfo());
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear ALL storage? This will log you out and remove all data.')) {
      try {
        setClearing(true);
        clearAllStorage();
        refreshInfo();
        toast.success('All storage cleared successfully!');
        // Reload page to reset app state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        toast.error('Failed to clear storage');
      } finally {
        setClearing(false);
      }
    }
  };

  const handleClearCustomer = () => {
    if (window.confirm('Clear customer storage? This will log out customer users.')) {
      try {
        setClearing(true);
        clearCustomerStorage();
        refreshInfo();
        toast.success('Customer storage cleared successfully!');
      } catch (error) {
        toast.error('Failed to clear customer storage');
      } finally {
        setClearing(false);
      }
    }
  };

  const handleClearApplicationData = () => {
    if (window.confirm('Clear all application data? This will remove all applications, packages, products, etc. but keep auth tokens.')) {
      try {
        setClearing(true);
        clearApplicationData();
        refreshInfo();
        toast.success('Application data cleared successfully!');
        // Reload page to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        toast.error('Failed to clear application data');
      } finally {
        setClearing(false);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleExport = () => {
    try {
      downloadStorage(`blox-storage-backup-${new Date().toISOString().split('T')[0]}.json`);
      toast.success('Storage backup downloaded successfully!');
    } catch (error) {
      toast.error('Failed to export storage');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await restoreStorage(file, false);
      refreshInfo();
      toast.success('Storage restored successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Failed to import storage. Please check the file format.');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportMerge = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await restoreStorage(file, true);
      refreshInfo();
      toast.success('Storage merged successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Failed to merge storage. Please check the file format.');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Box className="clear-storage-page">
      <Typography variant="h4" className="page-title">
        Storage Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage and clear application storage for testing purposes
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Storage Information</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={refreshInfo}
          >
            Refresh
          </Button>
        </Box>
        
        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            localStorage Size: <strong>{formatBytes(storageInfo.localStorageSize)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            sessionStorage Size: <strong>{formatBytes(storageInfo.sessionStorageSize)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Keys: <strong>{storageInfo.localStorageKeys.length + storageInfo.sessionStorageKeys.length}</strong>
          </Typography>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            localStorage Keys:
          </Typography>
          {storageInfo.localStorageKeys.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No keys found
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {storageInfo.localStorageKeys.map((key) => (
                <Box
                  key={key}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {key}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {storageInfo.sessionStorageKeys.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              sessionStorage Keys:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {storageInfo.sessionStorageKeys.map((key) => (
                <Box
                  key={key}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  {key}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Tip:</strong> Export your storage before clearing to restore it later. 
        localStorage persists across dev server restarts, but you can backup/restore manually.
      </Alert>

      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f0f9ff', border: '1px solid', borderColor: 'primary.light' }}>
        <Typography variant="h6" gutterBottom>
          Backup & Restore
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Export your current storage data to a JSON file, or restore from a previous backup.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export Storage
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Upload />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import Storage (Replace)
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Upload />}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'application/json';
              input.onchange = (e) => handleImportMerge(e as any);
              input.click();
            }}
          >
            Import Storage (Merge)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </Box>
      </Paper>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Warning:</strong> Clearing storage will remove all data including authentication tokens, 
        applications, and user data. This action cannot be undone.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Clear Application Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Removes all applications, packages, products, offers, promotions, and deferrals. 
            Keeps authentication tokens.
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteForever />}
            onClick={handleClearApplicationData}
            disabled={clearing}
          >
            Clear Application Data
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Clear Customer Storage
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Removes customer authentication tokens, applications, and deferrals. 
            Keeps admin data.
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteForever />}
            onClick={handleClearCustomer}
            disabled={clearing}
          >
            Clear Customer Storage
          </Button>
        </Paper>

        <Paper sx={{ p: 3, border: '2px solid', borderColor: 'error.main' }}>
          <Typography variant="h6" gutterBottom color="error">
            Clear All Storage
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Removes ALL data including authentication tokens, applications, packages, products, 
            and all other stored data. You will be logged out.
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteForever />}
            onClick={handleClearAll}
            disabled={clearing}
          >
            Clear All Storage
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

