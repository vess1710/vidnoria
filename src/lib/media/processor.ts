// ============================================================================
// Vidnoria - Media Processor (FFmpeg)
// ============================================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import ffmpegStatic from 'ffmpeg-static';
import type { AudioFormat, AudioBitrate } from '@/types';

const execFileAsync = promisify(execFile);

const FFMPEG_TIMEOUT = 300_000; // 5 minutes max
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max

/**
 * Resolve the FFmpeg executable path (prefers bundled ffmpeg-static, falls back to system PATH).
 */
export function getFFmpegBinary(): string {
  const localWin = path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  if (fsSync.existsSync(localWin)) return localWin;

  const localUnix = path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (fsSync.existsSync(localUnix)) return localUnix;

  if (ffmpegStatic && typeof ffmpegStatic === 'string' && fsSync.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  return 'ffmpeg';
}

/**
 * Resolve the yt-dlp executable path (prefers project ./bin/yt-dlp.exe or ./bin/yt-dlp, falls back to system PATH).
 */
export function getYtDlpBinary(): string {
  const localWin = path.join(/*turbopackIgnore: true*/ process.cwd(), 'bin', 'yt-dlp.exe');
  if (fsSync.existsSync(localWin)) return localWin;

  const localUnix = path.join(/*turbopackIgnore: true*/ process.cwd(), 'bin', 'yt-dlp');
  if (fsSync.existsSync(localUnix)) return localUnix;

  return 'yt-dlp';
}

/**
 * Extract audio from a video file and convert to the specified format.
 */
export async function extractAudio(
  inputPath: string,
  format: AudioFormat = 'mp3',
  bitrate: AudioBitrate = '192'
): Promise<string> {
  const outputDir = path.join(os.tmpdir(), 'vidnoria');
  await fs.mkdir(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `${crypto.randomUUID()}.${format}`);

  const codecMap: Record<AudioFormat, string> = {
    mp3: 'libmp3lame',
    m4a: 'aac',
    aac: 'aac',
    wav: 'pcm_s16le',
    flac: 'flac',
  };

  const args = [
    '-i', inputPath,
    '-vn',  // No video
    '-acodec', codecMap[format] || 'libmp3lame',
    ...(format !== 'wav' && format !== 'flac' ? ['-b:a', `${bitrate}k`] : []),
    '-y',   // Overwrite output
    outputFile,
  ];

  try {
    await execFileAsync(getFFmpegBinary(), args, {
      timeout: FFMPEG_TIMEOUT,
      maxBuffer: 5 * 1024 * 1024,
    });

    // Verify output exists and check size
    const stat = await fs.stat(outputFile);
    if (stat.size > MAX_FILE_SIZE) {
      await fs.unlink(outputFile).catch(() => {});
      throw new Error('Output file exceeds maximum size limit');
    }

    return outputFile;
  } catch (err) {
    // Clean up on error
    await fs.unlink(outputFile).catch(() => {});
    throw err;
  }
}

/**
 * Convert a video file to a different format.
 */
export async function convertVideo(
  inputPath: string,
  format: 'mp4' | 'webm' | 'mov' = 'mp4'
): Promise<string> {
  const outputDir = path.join(os.tmpdir(), 'vidnoria');
  await fs.mkdir(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `${crypto.randomUUID()}.${format}`);

  const args = [
    '-i', inputPath,
    ...(format === 'mp4' || format === 'mov'
      ? ['-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart']
      : ['-c:v', 'libvpx-vp9', '-c:a', 'libopus']),
    '-y',
    outputFile,
  ];

  try {
    await execFileAsync(getFFmpegBinary(), args, {
      timeout: FFMPEG_TIMEOUT,
      maxBuffer: 5 * 1024 * 1024,
    });

    const stat = await fs.stat(outputFile);
    if (stat.size > MAX_FILE_SIZE) {
      await fs.unlink(outputFile).catch(() => {});
      throw new Error('Output file exceeds maximum size limit');
    }

    return outputFile;
  } catch (err) {
    await fs.unlink(outputFile).catch(() => {});
    throw err;
  }
}

/**
 * Get media file information.
 */
export async function getMediaFileInfo(filePath: string): Promise<{
  duration: number;
  size: number;
  format: string;
}> {
  const stat = await fs.stat(filePath);
  return { duration: 0, size: stat.size, format: path.extname(filePath).slice(1) || 'unknown' };
}

/**
 * Check if FFmpeg is available on the system or bundled.
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execFileAsync(getFFmpegBinary(), ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if yt-dlp is available on the system or in ./bin.
 */
export async function checkYtDlp(): Promise<boolean> {
  try {
    await execFileAsync(getYtDlpBinary(), ['--version'], { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}
