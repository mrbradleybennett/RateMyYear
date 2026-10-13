# Rate My Year: End Of Year Review

A one-page website for rating yourself, your mates and your family across 8 areas of life. People sign in with Google to set up or join a **Review Crew**, then review each other. Crew admins see everyone's reports.

It runs on Firebase (Google), which is free at family and friends scale. Firebase hosts the page, handles Google sign-in, and stores the reviews.

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The review page: questions, wheel, report card, joining a crew from the invite link |
| `mycrew.html` | The **My Crew** page for crew admins: set up a crew, people, invite link, Manage, and all the reports |
| `firebase-config.js` | Leave this alone if you deploy with Firebase Hosting. Fill it in only if you host the page somewhere else |
| `firestore.rules` | Database security: who can read and write what |
| `firebase.json`, `.firebaserc` | Firebase project settings |
| `tests/rules.test.mjs` | Automated checks for the security rules |
| `src/crew.js` | Readable copy of the crew code that sits inside `index.html` |

## Set it up (about 15 minutes, one time)

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. Click **Create a project**. Name it something like `ratemyyear`. You can turn Google Analytics off.
3. Note the **Project ID** shown under the name (for example `ratemyyear-4f2a1`).

### 2. Turn on Google sign-in
1. In the left menu, open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab, choose **Google**, switch it on, pick a support email, and click **Save**.

### 3. Create the database
1. Open **Build → Firestore Database** and click **Create database**.
2. Choose a location. `australia-southeast2 (Melbourne)` keeps the data in Australia. You can't change this later.
3. Choose **Start in production mode**. The rules in this folder replace the defaults when you deploy.

### 4. Install the Firebase tool on your computer
1. Install Node.js (the LTS version) from <https://nodejs.org>.
2. Open Terminal (Mac) or Command Prompt (Windows) and run:
   ```
   npm install -g firebase-tools
   firebase login
   ```

### 5. Connect this folder to your project
1. In Terminal, go into this folder (`cd path/to/ratemyyear`).
2. Open `.firebaserc` and replace `YOUR-PROJECT-ID` with your Project ID, or run `firebase use --add` and pick the project.

### 6. Put it online
```
firebase deploy
```
When it finishes, it prints your site address, such as `https://ratemyyear-4f2a1.web.app`. That's the link to share.

Run `firebase deploy` again whenever you change the files.

## Using your own domain (optional)
1. In the Firebase console, open **Build → Hosting → Add custom domain** and follow the steps (for example `ratemyyear.com`).
2. Then open **Authentication → Settings → Authorized domains** and add the same domain, or Google sign-in won't work there.

## How crews work
- **Set up a crew (crew admin only):** tap **Create My Crew** at the top of the site. That opens the **My Crew** page: sign in with Google, then give the crew a name and your name. You become the crew's admin.
- **My Crew page:** everything an admin does lives here: adding people, the invite link (Share / Copy / New link), **Manage** for each person, and the **All scores**, **Member reports** and **Crew report** tabs. The review page just has a **My Crew** button at the top for admins.
- **Invite people:** add everyone's names, then copy the **invite link** from the crew box and send it by text or email.
- **Joining needs no sign-in:** anyone who opens the invite link goes straight into the crew as a guest. They pick their own name under "I am" (or "I'm not on the list. Add me") and can review anyone.
- **Guests are tied to their device.** If someone changes phone or clears their browser, they just open the invite link again. If their name shows as taken, the admin taps **Free up name** next to it.
- **Who sees what:**
  - Everyone in the crew sees the list of people and can add more.
  - You see the reviews you've written and the reviews about you.
  - Admins see everyone's reviews, the **All scores** table, **Member reports** and the **Crew report**.
- **Admin tools:** tap **Manage** next to anyone in the crew to:
  - **Free up name:** they pick their name again on a new device. Their reviews are kept.
  - **Make admin / Remove admin**
  - **Reset:** deletes every review by and about them and frees up their name. They stay in the crew.
  - **Delete:** removes them from the crew with all reviews by and about them.
  
  Reset and Delete ask you to tap twice. Press **New link** in the invite box to stop an old invite link working.
- **Firebase settings this needs:** Authentication → Sign-in method → **Google** and **Anonymous** both switched on.

## Testing locally (optional)
```
npm install
npm run serve
```
Then open <http://localhost:5000/?emulator=1>. This runs a local copy of Firebase with a fake Google sign-in, so you can try everything without touching real data.

To run the security rule checks:
```
npm run test:rules
```

## Good to know
- Free tier limits are generous (50,000 reads and 20,000 writes a day). A family or footy club won't get near them.
- Reviews are visible to the people described above. Remind your crew to be honest and fair.
- Crews can't be deleted from the site. This stops anyone re-creating a deleted crew to read old data. To remove one completely, delete it in the Firebase console under **Firestore Database**.
