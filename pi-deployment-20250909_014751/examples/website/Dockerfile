# Simple Static Website Dockerfile
FROM nginx:alpine

# Copy website files
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]