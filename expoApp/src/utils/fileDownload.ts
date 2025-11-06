import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Linking } from 'react-native';

/**
 * Downloads a file from a URL and allows the user to share/open it
 * @param url - The URL of the file to download
 * @param filename - The desired filename for the downloaded file
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  try {
    // Get file extension from filename or URL
    const extension = filename.split('.').pop() || 'pdf';

    // Handle web platform differently - just open the URL directly
    if (Platform.OS === 'web') {
      console.log(`[DOWNLOAD] Opening ${filename} on web`);
      await Linking.openURL(url);
      return true;
    }
    
    // For mobile platforms, use file system
    // Use cacheDirectory as fallback if documentDirectory is not available
    const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    
    if (!directory) {
      throw new Error('No file system directory available');
    }
    
    const fileUri = `${directory}${filename}`;

    // Download the file using the legacy API
    console.log(`[DOWNLOAD] Downloading ${filename} from ${url}`);
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }

    console.log(`[DOWNLOAD] File downloaded to ${downloadResult.uri}`);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: getMimeType(extension),
        dialogTitle: `Download ${filename}`,
      });
      return true;
    } else {
      // On some platforms, we might need to open the file directly
      console.log('[DOWNLOAD] Sharing not available, file saved to:', downloadResult.uri);
      return true;
    }
  } catch (error) {
    console.error('[DOWNLOAD] Error downloading file:', error);
    throw error;
  }
}

/**
 * Gets the MIME type based on file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Formats file size in bytes to human-readable format
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

