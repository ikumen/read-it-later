# Read It Later
A tiny, searchable, archivable, no-nonsense bookmarking app&mdash;a side project while I was learning [Firebase](//firebase.google.com). For personal/demo use, the app will run pretty much within the [free quota limits](https://firebase.google.com/docs/firestore/quotas#free-quota), YMMV.

<img src="https://i.imgur.com/Axe1j80.png" width="400"> <img src="https://i.imgur.com/DPcpxdA.png" width="400">

## Quick Start

### Prerequisite

* you should be familiar with developing JavaScript applications (client and NodeJS)
* have GitHub account, we use GitHub as an (OAuth provider](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/)
* and these instructions have only been tested on my local computer, running OSX

### Cool, Let's Get Started

1. Sign up for Firebase and create a project, make note of the `project id`.
1. Set your default resource location:
   * select Project settings -> General tab -> edit "Google Cloud Platform (GCP) resource location"
   * select "nam5 (us-central)" most services are available in this location
1. Upgrade to "Blaze" plan, it'll allow us to make external calls to fetch bookmarked web pages. It's a "pay as you go" plan, but only after you've exhausted the [free quotas](https://firebase.google.com/docs/firestore/quotas#free-quota).
1. Register our app on GitHub as an OAuth App:
   * login into your GitHub account and go to "Settings" -> "Developer settings" -> "OAuth Apps"
   * click the "New OAuth App" button and enter:
     - your application name
     - `https://<project-id>.web.app` as the Homepage URL
     - optional description
     - `https://<project-id>.firebaseapp.com/__/auth/handler` as the callback URL
   * click "Register Application"
   * take note of the generated `Client ID` and `Client Secret`
1. Add GitHub as OAuth Provider
   * from Firebase console (https://console.firebase.google.com/project/<project id>/overview)
   * from left-hand menu, "Develop" -> "Authentication" -> "Sign-in method"
   * select GitHub, then "Enable" and add the `Client ID` and `Client Secret` from earlier
   * then "Save"
1. Provision a Firestore database
   * from Firebase console, left-hand menu, "Develop" -> "Database" 
   * click "Create database", choose "Start in production mode", then "Next" and "Done"
1. Provision a Storage service to keep our bookmark archives
   * from Firebase console, left-hand menu, "Develop" -> "Storage"
   * click "Get started", then "Next" and "Done"
1. Setup the Firebase CLI tool, then authorize the tool:
   * `npm install -g firebase-tools`
   * `firebase login`
1. Download this project: 
   * `git clone https://github.com/ikumen/read-it-later.git`
1. Install dependencies:
   * `cd functions && npm install`
1. Edit the `read-it-later/.firebaserc` file, and set your `project id` as the "default"
1. Restrict access for yourself only (this was meant to be a personal app)
   * `firebase functions:config:set security.authorized="<your email used to sign into GitHub>"
1. Deploy your project:
   * `firebase deploy`

Your app should be deployed to `https://<project id>.web.app`
 
