#!/usr/bin/env python3
"""
YouTube Transcript Fetcher
Fetches transcripts/captions from YouTube videos using youtube-transcript-api
"""

import sys
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url_or_id: str) -> str:
    """Extract YouTube video ID from URL or return the ID if already extracted."""
    if not url_or_id:
        return None
    
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    
    return None

def fetch_transcript(video_url: str, languages: list = None) -> dict:
    """
    Fetch transcript for a YouTube video.
    
    Args:
        video_url: YouTube video URL or video ID
        languages: List of language codes to try (default: ['en', 'en-US', 'en-GB'])
    
    Returns:
        dict with transcript data or error message
    """
    if languages is None:
        languages = ['en', 'en-US', 'en-GB', 'af']
    
    video_id = extract_video_id(video_url)
    
    if not video_id:
        return {
            "success": False,
            "error": "Invalid YouTube URL or video ID",
            "video_id": None
        }
    
    try:
        ytt_api = YouTubeTranscriptApi()
        
        transcript_list = ytt_api.list(video_id)
        
        transcript = None
        used_language = None
        is_generated = False
        
        for lang in languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                used_language = lang
                is_generated = transcript.is_generated
                break
            except:
                continue
        
        if transcript is None:
            try:
                for t in transcript_list:
                    transcript = t
                    used_language = t.language_code
                    is_generated = t.is_generated
                    break
            except:
                pass
        
        if transcript is None:
            return {
                "success": False,
                "error": "No transcript available for this video",
                "video_id": video_id
            }
        
        transcript_data = transcript.fetch()
        
        full_text = " ".join([item.text for item in transcript_data])
        
        segments = []
        for item in transcript_data:
            segments.append({
                "text": item.text,
                "start": round(item.start, 2),
                "duration": round(item.duration, 2)
            })
        
        return {
            "success": True,
            "video_id": video_id,
            "language": used_language,
            "is_auto_generated": is_generated,
            "full_text": full_text,
            "segments": segments,
            "segment_count": len(segments)
        }
        
    except Exception as e:
        error_msg = str(e)
        if "Transcripts are disabled" in error_msg:
            return {
                "success": False,
                "error": "Transcripts are disabled for this video",
                "video_id": video_id
            }
        elif "Video unavailable" in error_msg or "private" in error_msg.lower():
            return {
                "success": False,
                "error": "Video is unavailable or private",
                "video_id": video_id
            }
        else:
            return {
                "success": False,
                "error": error_msg,
                "video_id": video_id
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python youtube_transcript.py <video_url_or_id> [language_codes]"
        }))
        sys.exit(1)
    
    video_url = sys.argv[1]
    languages = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    
    result = fetch_transcript(video_url, languages)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
