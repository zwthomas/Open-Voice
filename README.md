# Open-Voice

![](./doc/openvoice.gif)

## Commands 
- setup: Sets the bot up in the server
- remove: Removes all the channels and category this bot manages
- cleanup: Deletes empty channels that were created in the bots category and any channel that wasn't created by the bot


![](./doc/Setup.PNG)



4. The discord token is loaded in from a config file. You will need to create this file. Create a file named **discord.ini**. That file should have the following format:
```
[discord]
token = 

```
To the right of the equals sign put your token.

## updates 
- discord api token now stored in ![vault](https://www.vaultproject.io/)
- password retrieved using ![hvac](https://github.com/hvac/hvac)

## Docker
### Building
```
docker build --no-cache --tag open-voice:<version> .
```
### Running 
```
docker run -v path to config:/usr/src/app/config --detach --name open-voice open-voice:<version>
```
compose
```
---
version: "2.1"
services:
  open-voice:
    image: localhost:5000/open-voice:latest
    container_name: open-voice
    volumes:
      - path to config:/usr/src/app/config
    restart: unless-stopped

```
