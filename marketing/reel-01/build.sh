set -e
FPS=30
make_scene() { # $1=n $2=duration
  n=$1; d=$2; fr=$(python3 -c "print(round($d*$FPS))")
  ffmpeg -v error -y -loop 1 -framerate $FPS -t $d -i s$n.png -i s$n.png -i o$n.png -filter_complex "
    [0:v]scale=-2:1920,crop=1080:1920,boxblur=28:2,eq=brightness=-0.22:saturation=0.9[bg];
    [1:v]scale=2160:-2,zoompan=z='1+0.10*on/$fr':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$fr:s=1080x608:fps=$FPS[fg];
    [bg][fg]overlay=0:656:shortest=1[v1];
    [v1][2:v]overlay=0:0,fade=t=in:st=0:d=0.3,fade=t=out:st=$(python3 -c "print($d-0.3)"):d=0.3,format=yuv420p[v]" \
    -map "[v]" -r $FPS -c:v libx264 -preset medium -crf 18 -t $d scene$n.mp4
}
make_scene 1 3.6
make_scene 2 11.0
make_scene 3 11.3
make_scene 4 4.0
make_scene 5 8.1
printf "file 'scene%s.mp4'\n" 1 2 3 4 5 > list.txt
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy video.mp4
ffmpeg -v error -y -i video.mp4 -i voice.mp3 -filter_complex "[1:a]adelay=200|200,apad,loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart AstroVidya-reel-01.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact AstroVidya-reel-01.mp4
