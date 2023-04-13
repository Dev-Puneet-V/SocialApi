# Base image
FROM node:14

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

# Run tests
RUN npm run test

# Expose port
EXPOSE ${PORT}

# Start app
CMD ["npm", "start"]
