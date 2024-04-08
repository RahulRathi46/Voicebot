# Use the official Node.js LTS Alpine image as a base image
FROM node:lts-alpine

# Set NODE_ENV to production
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json, package-lock.json, and npm-shrinkwrap.json to the working directory
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Install production dependencies
RUN npm install --production --silent && mv node_modules ../

# Copy the rest of the application code to the working directory
COPY . .

# Expose port 3000 to the outside world
EXPOSE 3000

# Change ownership of the working directory to the node user
RUN chown -R node /usr/src/app

# Set the node user as the user to run the container
USER node

# Command to run the application
CMD ["npm", "start"]
