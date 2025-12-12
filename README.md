# **Live Captioner by Osaeris**

This is an attempt to create a live captioner which can be fed audio by
any chosen source and provide 2-line subtitles on a chroma-green
background. Created on M series Mac. Uses metal for acceleration.

It's early days, but it's working! 🙂

------------------------------------------------------------------------

## **Requirements**

The Docker instance expects a Whisper server to be running.\
I tried to run this *inside* the Docker container, but performance was
too slow on Apple silicon, so Whisper runs natively on the host machine
(Apple M2).

------------------------------------------------------------------------

## **Install Whisper.cpp**

``` bash
brew install cmake
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make -j
```

### **Add a model (example: large-v3)**

``` bash
cd models
./download-ggml-model.sh large-v3
```

### **Run the Whisper server**

``` bash
./build/bin/whisper-server -m models/ggml-large-v3.bin -l en --port 9000
```

------------------------------------------------------------------------

## **Run the Docker Captioner Service**

Navigate to your project directory:

``` bash
cd ~/Documents/scripts/docker-projects/speech-captioner/
```

### **Stop and rebuild the container**

``` bash
docker stop captioner
docker rm captioner
docker build -t captioner .
docker run -p 8000:8000 --name captioner captioner
```

------------------------------------------------------------------------

## **Use the Captioner**

Visit:

http://127.0.0.1:8000/

Click **"Start captions"** (allow microphone permissions from your
chosen source).
