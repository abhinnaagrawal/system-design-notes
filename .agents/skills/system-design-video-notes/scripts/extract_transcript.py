#!/usr/bin/env python3
"""
Helper script to fetch metadata and transcript from a YouTube video.
Usage:
    python3 extract_transcript.py <youtube_url_or_video_id> [output_file.json]
"""

import sys
import os
import re
import json
import urllib.request
import tempfile
import subprocess

def extract_video_id(url_or_id):
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/watch\?v=|\&v=)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/live\/([a-zA-Z0-9_-]{11})'
    ]
    for pattern in patterns:
        m = re.search(pattern, url_or_id)
        if m:
            return m.group(1)
    raise ValueError(f"Could not extract YouTube video ID from: {url_or_id}")

def get_video_metadata(video_id):
    url = f"https://www.youtube.com/watch?v={video_id}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    title = ''
    author = ''
    length_seconds = 0
    short_desc = ''
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        m_title = re.search(r'<title>(.*?)(?: - YouTube)?</title>', html)
        if m_title:
            title = m_title.group(1).strip()
        m_data = re.search(r'var ytInitialPlayerResponse\s*=\s*({.*?});</script>', html)
        if m_data:
            player = json.loads(m_data.group(1))
            vd = player.get('videoDetails', {})
            title = vd.get('title', title)
            author = vd.get('author', author)
            length_seconds = int(vd.get('lengthSeconds', 0))
            short_desc = vd.get('shortDescription', '')
        if not author:
            m_author = re.search(r'\"ownerChannelName\":\s*\"([^\"]+)\"', html)
            if m_author:
                author = m_author.group(1)
    except Exception as e:
        sys.stderr.write(f"Warning: Failed to fetch metadata: {e}\n")
    return {
        'title': title or f'System Design Video ({video_id})',
        'author': author,
        'lengthSeconds': length_seconds,
        'shortDescription': short_desc
    }

def fetch_transcript(video_id):
    venv_dir = os.path.join(tempfile.gettempdir(), 'yt_transcript_env')
    python_bin = os.path.join(venv_dir, 'bin', 'python')
    if not os.path.exists(python_bin):
        subprocess.check_call([sys.executable, '-m', 'venv', venv_dir], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pip_bin = os.path.join(venv_dir, 'bin', 'pip')
        subprocess.check_call([pip_bin, 'install', '--quiet', 'youtube-transcript-api'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    inline_script = f"""
import json
from youtube_transcript_api import YouTubeTranscriptApi
api = YouTubeTranscriptApi()
transcript = api.fetch('{video_id}')
snippets = [{{'text': s.text, 'start': s.start, 'duration': s.duration}} for s in transcript]
print(json.dumps(snippets))
"""
    result = subprocess.check_output([python_bin, '-c', inline_script], stderr=subprocess.DEVNULL)
    return json.loads(result.decode('utf-8'))

def main():
    if len(sys.argv) < 2:
        print("Usage: extract_transcript.py <youtube_url_or_video_id> [output_file.json]")
        sys.exit(1)

    url_or_id = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    video_id = extract_video_id(url_or_id)
    print(f"[*] Processing Video ID: {video_id}")

    metadata = get_video_metadata(video_id)
    print(f"[*] Title: {metadata['title']}")
    print(f"[*] Channel: {metadata['author']}")
    print(f"[*] Duration: {metadata['lengthSeconds'] // 60}m {metadata['lengthSeconds'] % 60}s")

    print("[*] Fetching transcript...")
    snippets = fetch_transcript(video_id)
    print(f"[*] Successfully retrieved {len(snippets)} transcript snippets.")

    payload = {
        'video_id': video_id,
        'metadata': metadata,
        'snippets': snippets
    }

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        print(f"[*] Saved full transcript and metadata to {output_file}")
    else:
        print("\n=== Transcript Overview (Sample) ===")
        for s in snippets[:15]:
            m = int(s['start'] // 60)
            sec = int(s['start'] % 60)
            print(f"[{m:02d}:{sec:02d}] {s['text']}")

if __name__ == '__main__':
    main()
