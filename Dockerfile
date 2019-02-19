FROM node
WORKDIR /server
COPY . /server
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
# Run npm start when the container launches
# CMD ["npm", "run", "prod"]
