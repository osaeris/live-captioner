Live Captioner by Osaeris
=========================

This is an attempt to create a live captioner which can be fed audio by any chosen source and provide 2 line subtitles on a chroma green background.

It's early days but it's working :-)

REQUIREMENTS
============
The docker instance expects Whisper server to be running. I tried to do this in Docker container but it was too slow, so I run this natively on Apple M2 machine

Install Whisper
---------------
$ brew install cmake
$ git clone https://github.com/ggerganov/whisper.cpp
$ cd whisper.cpp
$ make -j

Add a model (I chose large-v3)
$ cd models
$ ./download-ggml-model.sh large-v3

and run the server:
$ ./build/bin/whisper-server  -m models/ggml-large-v3.bin  -l en --port 9000

Now run the docker container to provide the web side:

$ cd Documents/scripts/docker-projects/speech-captioner/

Stop and start the captioner service:

$ docker stop captioner
$ docker rm captioner
$ docker build  -t captioner .
$ docker run -p 8000:8000 --name captioner captioner

Now in Chrome visit: http://127.0.0.1:8000/

Click "Start captions" (allow microphone permissions from your chosen source)