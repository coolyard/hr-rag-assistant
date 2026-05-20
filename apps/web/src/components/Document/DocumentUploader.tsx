import { type FC, useCallback, useRef, useState } from 'react';

import { client } from '@/api/client';

import styles from './DocumentUploader.module.css';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

interface DocumentUploaderProps {
  onSuccess: () => void;
}

export const DocumentUploader: FC<DocumentUploaderProps> = ({ onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const showMessage = useCallback((msg: string, error: boolean) => {
    setMessage(msg);
    setIsError(error);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.name.toLowerCase().endsWith('.md')) {
        showMessage('仅支持 .md 格式的文件', true);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        showMessage('文件大小不能超过 1MB', true);
        return;
      }

      setUploading(true);
      showMessage('', false);

      try {
        const formData = new FormData();
        formData.append('file', file);

        await client.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        showMessage(`「${file.name}」上传成功，索引已更新`, false);
        onSuccess();
      } catch (err) {
        const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
        showMessage(axiosError.response?.data?.message ?? '上传失败，请重试', true);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [showMessage, onSuccess],
  );

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.uploadButton}
        onClick={handleClick}
        disabled={uploading}
        type="button"
      >
        {uploading ? '上传中...' : '📄 上传文档'}
      </button>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept=".md"
        onChange={(e) => {
          void handleFileChange(e);
        }}
      />
      {message && (
        <span className={isError ? styles.errorMessage : styles.successMessage}>{message}</span>
      )}
    </div>
  );
};
