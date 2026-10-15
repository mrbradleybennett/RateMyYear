# Rate My Year: End Of Year Review

A one-page website for rating yourself, your mates and your family across the areas of life that matter.

**Getting started:** the top of the main page has **Rate Me**, **Join A Crew** (crew search right on the page) and **Create A Crew** (goes to My Crew). Under them, **Rate My Family** and **Rate My Mates** switch to the matching questions and wheel.

**End of the report card:** outside a crew it offers **Share Results**, **Join A Crew** and **Create A Crew**. In a crew it offers **Share Results** and **Save & Review Another** (saves the review and starts a clean one for the next person). Share Results makes a picture of the report card. On https, **Send picture** opens the phone's share sheet (Messages, WhatsApp and so on) with the picture attached. **WhatsApp** and **Text message** send a summary with an optional mobile number, **Save picture** downloads it, and email opens the mail app. Each send is recorded in the `shares` collection (channel, plus the email or mobile if given).

**Crews:** every new crew is a **Family** crew or a **Mates** crew, and everyone in it is rated on that crew's questions. Crew admins can switch the type on My Crew (the **Crew type** box). Saved reviews are kept, and only reviews on the crew's current questions count, so switching back brings them back. Once you've joined, the crew box shows **Review My Crew**, your crew's name, the **I am** dropdown and the **Crew leaderboard**, with a Review button next to each person. The leaderboard is stored in `crews/{id}/board`, one anonymous entry per review, so the crew sees everyone's scores but not who gave which.

**Self vs crew:** in a crew, the report card shows the **Self assessment** and **Crew assessment** overall ratings side by side, and a **Biggest gaps** summary above the Top 3: the overall gap plus up to three areas that differ by a point or more. The area-by-area gaps show for your own review, and for crew admins. Everyone else sees the overall gap, taken from the leaderboard. Solo Rate Me shows the self rating with a prompt to join or create a crew.

**Headings:** Rate My Family shows "End Of Year Family Review" and Rate My Mates shows "End Of Year Mate Review", each with its own tagline.

**Two question sets:**
- **Me and family** (8 areas): Self (Self Care, Health), Others (Mates, Family & Others, Love), Life (Action, Growth Mindset, Humour).
- **Mates** (7 areas): Them (Vibe, Banter, Generous), Us (Reliable, Loyalty), Life (Adventure, Social).

Rate My Mates uses the mates questions. In a crew, anyone added as a mate is rated on the mates questions (including their own self review), and everyone else on the me and family questions. Crew reports show a separate table for each set. People sign in with Google to set up or join a **Review Crew**, then review each other. Crew admins see everyone's reports.

It runs on Firebase (Google), which is free at family and friends scale. Firebase hosts the page, handles Google sign-in, and stores the reviews.

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The review page: questions, wheel, report card, joining a crew from the invite link |
| `join.html` | The **Join A Crew** page: search for a crew by name and enter the crew password |
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
- **Crew name and password:** every crew has a unique name and a crew password, both set when you create it (change the password any time on **My Crew**).
- **Joining:** your crew tap **Join A Crew** at the top of the site (it opens the Join A Crew page), search for the crew name, and enter the crew password. They're then taken back to the review page with the crew open. Or send them the **invite link** (Share / Copy on My Crew), which takes them straight in with no password.
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
