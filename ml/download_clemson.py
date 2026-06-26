"""
Download and extract the Clemson Cafeteria Dataset.

Source: https://cecas.clemson.edu/~ahoover/cafeteria/
- 276 participants eating meals in a cafeteria
- Wrist-worn IMU: 3-axis accelerometer + 3-axis gyroscope at 15 Hz
- Ground truth gesture labels: bite, drink, rest, utensiling, other
- Accelerometer: ST Microelectronics LIS344alh (raw volts)
- Gyroscope: ST Microelectronics LPY410al (raw volts)

This script downloads the sensor data and gesture ground truth,
then extracts them into ml/data/clemson/.
"""

import os
import sys
import zipfile
import urllib.request
from pathlib import Path

BASE_URL = "https://cecas.clemson.edu/~ahoover/cafeteria"

DOWNLOADS = {
    "sensor_data": {
        "url": f"{BASE_URL}/all-data.zip",
        "filename": "all-data.zip",
        "description": "Wrist motion + scale data (55 MB)",
    },
    "gesture_gt": {
        "url": f"{BASE_URL}/all-gt-gestures.zip",
        "filename": "all-gt-gestures.zip",
        "description": "Gesture ground truth (dominant hand)",
    },
}


def download_file(url: str, dest: Path, description: str):
    if dest.exists():
        print(f"  Already downloaded: {dest.name}")
        return

    print(f"  Downloading {description}...")
    print(f"    URL: {url}")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VitalAI-Research/1.0"})
        with urllib.request.urlopen(req, timeout=300) as response:
            total = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 1024 * 256

            with open(dest, "wb") as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded / total * 100
                        print(f"\r    {downloaded / 1024 / 1024:.1f} / {total / 1024 / 1024:.1f} MB ({pct:.0f}%)", end="", flush=True)

            print()
            print(f"    Saved: {dest} ({downloaded / 1024 / 1024:.1f} MB)")

    except urllib.error.HTTPError as e:
        print(f"\n    HTTP Error {e.code}: {e.reason}")
        print("    The dataset may have moved. Check https://cecas.clemson.edu/~ahoover/cafeteria/")
        if dest.exists():
            dest.unlink()
        raise
    except urllib.error.URLError as e:
        print(f"\n    Connection error: {e.reason}")
        print("    Check your internet connection or try again later.")
        if dest.exists():
            dest.unlink()
        raise


def extract_zip(zip_path: Path, extract_to: Path):
    print(f"  Extracting {zip_path.name}...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)
    n_files = sum(1 for _ in extract_to.rglob("*") if _.is_file())
    print(f"    Extracted {n_files} files to {extract_to}")


def main():
    data_dir = Path(__file__).parent / "data" / "clemson"
    data_dir.mkdir(parents=True, exist_ok=True)

    downloads_dir = data_dir / "downloads"
    downloads_dir.mkdir(exist_ok=True)

    print("Clemson Cafeteria Dataset Downloader")
    print("=" * 50)
    print(f"Output directory: {data_dir}")
    print()

    for key, info in DOWNLOADS.items():
        dest = downloads_dir / info["filename"]
        download_file(info["url"], dest, info["description"])

        extract_dir = data_dir / key
        if not extract_dir.exists():
            extract_dir.mkdir()
            extract_zip(dest, extract_dir)
        else:
            print(f"  Already extracted: {extract_dir}")

    print()
    print("Download complete.")
    print(f"Sensor data: {data_dir / 'sensor_data'}")
    print(f"Gesture GT:  {data_dir / 'gesture_gt'}")
    print()
    print("Next step: run convert_clemson.py to convert to VitalAI pipeline format.")


if __name__ == "__main__":
    main()
