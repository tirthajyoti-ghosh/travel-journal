import { useState, useCallback } from 'react';
import * as mediaUploadService from '@/services/mediaUploadService';
import type { UploadProgress, UploadResult } from '@/services/mediaUploadService';

export interface MediaUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: string | null;
}

export function useMediaUpload() {
  const [state, setState] = useState<MediaUploadState>({
    isUploading: false,
    progress: null,
    result: null,
    error: null,
  });

  const uploadMedia = useCallback(async (uri: string): Promise<UploadResult> => {
    setState({
      isUploading: true,
      progress: { loaded: 0, total: 100, percentage: 0 },
      result: null,
      error: null,
    });

    const result = await mediaUploadService.uploadMedia(uri, (progress) => {
      setState((prev) => ({
        ...prev,
        progress,
      }));
    });

    setState({
      isUploading: false,
      progress: null,
      result,
      error: result.success ? null : result.error || 'Upload failed',
    });

    return result;
  }, []);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    uploadMedia,
    reset,
  };
}

export interface MultiMediaUploadState {
  isUploading: boolean;
  currentIndex: number;
  totalFiles: number;
  progress: UploadProgress | null;
  results: UploadResult[];
  error: string | null;
}

export function useMultiMediaUpload() {
  const [state, setState] = useState<MultiMediaUploadState>({
    isUploading: false,
    currentIndex: 0,
    totalFiles: 0,
    progress: null,
    results: [],
    error: null,
  });

  const uploadMultipleMedia = useCallback(async (uris: string[]): Promise<UploadResult[]> => {
    setState({
      isUploading: true,
      currentIndex: 0,
      totalFiles: uris.length,
      progress: { loaded: 0, total: 100, percentage: 0 },
      results: [],
      error: null,
    });

    const results = await mediaUploadService.uploadMultipleMedia(
      uris,
      (index, progress) => {
        setState((prev) => ({
          ...prev,
          currentIndex: index,
          progress,
        }));
      }
    );

    const hasErrors = results.some((r) => !r.success);

    setState({
      isUploading: false,
      currentIndex: results.length,
      totalFiles: uris.length,
      progress: null,
      results,
      error: hasErrors ? 'Some uploads failed' : null,
    });

    return results;
  }, []);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      currentIndex: 0,
      totalFiles: 0,
      progress: null,
      results: [],
      error: null,
    });
  }, []);

  return {
    ...state,
    uploadMultipleMedia,
    reset,
  };
}
