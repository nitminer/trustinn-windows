FROM electronuserland/builder:wine

WORKDIR /workspace

# Use the Electron Builder base image so Windows packaging tools are available.
# The app source is mounted at runtime, so build commands run inside the container.
CMD ["bash", "-lc", "npm install && npm run dist"]
