# Contributing

Are you interested in making things better? Then by all means contribute! You can do so in a number of ways:

* [Contact GSA](https://www.regulations.gov/support) about regulations.gov and relate your own experience (good or bad) to the new regulations.gov site
* [Submit a feature request or a bug report](https://github.com/jakerella/usgov-regs/issues) on this site using GitHub Issues.
* Create your own application on top of the [regulations.gov API](https://open.gsa.gov/api/regulationsgov/) so we can show them what can be done.
* Or you could contribute code to this application! Information on how to run this app locally and submit a PR are located below.

## Running Locally

This system can be run _almost_ entirely locally. The only piece that can't be run locally is the regulations.gov API. But you can easily [sign up for an API key](https://api.data.gov/signup/) yourself in order to hit the API. You could also create a mock API for development if you like.

### Environment Setup

1. [Create an SSL certificate for `localhost`](https://www.section.io/engineering-education/how-to-get-ssl-https-for-localhost/) since Chrome/Firefox force you there. Put the decrypted key and crt in a `localcert` directory inside this project.
2. [Install Node.js](https://nodejs.org/en/download/) (check the `package.json` file to see what version the site runs on)
3. [Install and run Postgres](https://www.postgresql.org/download/)
4. Create a Postgres user and database, then create the `user` table using the `schema/user.sql` file to create the table(s)
5. [Install and run Redis](https://redis.io/topics/quickstart) for session and document caching
6. Install the dependencies with `npm install`
7. Configure your environment variables by copying `.env.example` and renaming it to `.env`, then change the values to match your local environment!

Now you should be ready to run the application locally with `node .` (or use `npm run watch` to continuously watch for file changes and restart the app).

## Submitting a Pull Request

Please be sure to follow the Pull Request template on GitHub. This ensures that the changes can be reviewed thoroughly and integrated!
