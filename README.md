# hubot-google-hangouts-chat

This is a [Hubot](http://hubot.github.com/) adapter for [Hangouts Chat](https://gsuite.google.com/products/chat/).

Documentation is available in [Google Developers site](https://developers.google.com/hangouts/chat/how-tos/integrate-hubot).


## Loading credentials from environment variables

  If you are running on Heroku you can't rely on a json file. You must have the json
 available as a environment variable direclty. It is described [here](https://github.com/googleapis/google-auth-library-nodejs/blob/master/README.md#loading-credentials-from-environment-variables).

  So instead of setting a `GOOGLE_APPLICATION_CREDENTIALS` environment variable you can
 provide the json data inside `GOOGLE_APPLICATION_CREDENTIALS_DATA` like that:

  ```
 GOOGLE_APPLICATION_CREDENTIALS_DATA='{
   "type": "service_account",
   "project_id": "your-project-id",
   "private_key_id": "your-private-key-id",
   "private_key": "your-private-key",
   "client_email": "your-client-email",
   "client_id": "your-client-id",
   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
   "token_uri": "https://accounts.google.com/o/oauth2/token",
   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
   "client_x509_cert_url": "your-cert-url"
 }' node bot.js
 ```
