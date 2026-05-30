FROM electronuserland/builder:wine

WORKDIR /workspace

# Use the Electron Builder base image so Windows packaging tools are available.
# The app source is mounted at runtime, so build commands run inside the container.
RUN apt-get update && apt-get install -y jq

CMD ["bash", "-lc", "npm install && npm run dist && echo '=== Build Complete ===' && echo '=== Checking for .exe files ===' && find /workspace/dist -name '*.exe' -o -name '*.nsis.7z' || echo 'No exe/nsis.7z files found!' && ls -lah /workspace/dist/"]
