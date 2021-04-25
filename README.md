# US Government Rule and Regulation Explorer

This is a little web app to help navigate the rules, regulations, and comments for the US Government using the regulations.gov API.

**This site and code have no connection to the U.S. Government!**

Check it out at: [usgov-regs.herokuapp.com](https://usgov-regs.herokuapp.com)

## Why did you build this?

In late 2020, the General Services Administration (GSA) released a new version of "regulations.gov" - the U.S. Government's website for publishing agency rulemaking dockets and documents - to replace the aging, Flash-based version. That site is intended to give citizens transparency into the agency rule making process. It allows people to look at proposed rule changes and the comments on them. A person can even submit comments on those documents.

Unfortunately, this new version was not quite ready for prime time and lacked key features and data organization that had enabled organizations to act on that transparency. This application was created using the new API provided by GSA and Data.gov into the regulations.gov data. That API still has many faults, but it allows this application to provide a better user experience.

## Contributing

Are you interested in making things better? Then by all means contribute! You can do so in a number of ways:

* [Contact GSA](https://www.regulations.gov/support) about regulations.gov and relate your own experience (good or bad) to the new regulations.gov site
* [Submit a feature request or a bug report](https://github.com/jakerella/usgov-regs/issues) on this site using GitHub Issues.
* Create your own application on top of the [regulations.gov API](https://open.gsa.gov/api/regulationsgov/) so we can show them what can be done.
* Or you could contribute code to this application! Information on how to run this app locally and submit a PR are located below.

### Running Locally

This system can be run _alomst_ entirely locally. The only piece that can't be run locally is the regulations.gov API. But you can easily [sign up for an API key](https://api.data.gov/signup/) yourself in order to hit the API. You could also create a mock API for development if you like.

#### Environment Setup

1. [Install Node.js](https://nodejs.org/en/download/) (check the `package.json` file to see what version the site runs on)
2. [Install and run Postgres](https://www.postgresql.org/download/) for the user database
3. Create a Postgres user and database, then create the `user` table using the `schema/user.sql` file
4. [Install and run Redis](https://redis.io/topics/quickstart) for session and document caching
5. Clone this repo locally: `git clone https://github.com/jakerella/usgov-regs.git` (or use the git ssh version)
6. Install the dependencies with `npm install`
7. Configure your environment variables by copying `.env.example` and renaming it to `.env`, then change the values to match your local environment!

Now you should be ready to run the application locally with `node .`

### Submitting a Pull Request

Please be sure to follow the Pull Request template on GitHub. This ensures that the changes can be reviewed thoroughly and integrated!

#### Author and License

This application was created by Jordan Kasper (@jakerella) and is published under the [MIT license](https://opensource.org/licenses/MIT):

> Copyright 2021 Jordan Kasper
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
