## Rural Connect Hub – Volunteer App Training Flow

Yeh file **presentation + field training** ke liye hai. Har feature ka **step‑by‑step flow** yahan likha hai – trainer isko slide ya printout me use kar sakte hain.

Language: simple **Hindi + thodi English (Hinglish)**.

---

## 1. App kholna, registration aur login

- **App kholna**
  - Volunteer `balbirrs.com` / app URL open karega.
  - Pehle **Welcome screen** dikhegi – `Login` button + language change ka option.

- **Naya volunteer registration (pehli baar)**  
  Ye flow tab chalta hai jab volunteer `Login` try karta hai aur system bolta hai **"aap registered nahi ho"**.

  1. **Unit select (Register Village step)**  
     - Screen: “Select your Unit (Village/Ward)”.  
     - Volunteer apna gaon/ward choose karega (yehi uska primary area hai).  
     - Select karne ke baad ek chhota **Confirm dialog** aata hai → “Proceed with this unit” pe click.

  2. **Identity OTP (Register OTP step)**  
     - Next screen pe heading: **Verify Your Identity**.  
     - Volunteer **email ya mobile** type karta hai (dono allowed).  
     - **Send OTP** → OTP SMS/email aata hai.  
     - 4 digit OTP daal kar **Verify** kare.  
     - Sahi hone par system **registration form (multi‑step)** pe le jata hai.

  3. **Registration wizard – step by step**

     **Step 1 – Role selection (Role step)**  
     - Screen pe show hota hai ki volunteer sirf **volunteer** hai ya saath me **party/government post holder** bhi hai.  
     - Yahan se decide hota hai ki aage kaun‑kaun se extra details / cards khulenge.

     **Step 2 – Volunteer details**  
     - Basic personal information:
       - Naam, gender, DOB, address, mobile, email.  
       - Profile photo (camera ya upload).  
       - ID details (Aadhaar / voter card) – OCR se auto‑read ka option bhi ho sakta hai.  
     - Ye step complete karne ke baad **Next**.

     **Step 3 – PPH (Party/Govt Post Holder) details – agar role me tick kiya ho**  
     - Yahan volunteer ke political / govt role ka detail:  
       - Party ya Govt card choose.  
       - Level (Booth / Village / Block / District, etc).  
       - Wing (Mahila, Yuva, Farmers, etc) – dropdown + “Other” option.  
       - Position (Adhyaksh, General Secretary, etc) – dropdown + “Other”.  
       - Jurisdiction villages ki list (multi‑select).
     - Agar volunteer ke paas **sirf volunteer role** hai to ye step minimal / skip ho jata hai.

     **Step 4 – Additional roles (optional)**  
     - Agar kisi ke paas 1 se zyada cards/post hain to **“Add another role”** button se extra role cards add kiye ja sakte hain.  
     - Har extra role ke liye upar jaisa hi wing/position/level/jurisdiction select hota hai.

     **Final submit (Complete Registration)**  
     - Sab steps complete hone ke baad **summary** type screen + `Submit` / `Finish` button.  
     - Submit karte hi:
       - Backend me `AppUser` record create/update hota hai.  
       - User ko local storage me save kiya jata hai.
       - `onComplete` ke through user ko **direct login** kara diya jata hai.

  4. **Registration ke turant baad**  
     - OTP verify + registration wizard complete hote hi volunteer ka status **“logged in”** ho jata hai.  
     - App automatically:
       - User data browser me save karta hai.  
       - **Task Home / Dashboard** screen open karta hai (Available Tasks dikhte hain).

- **Dubaara login (existing user)**
  1. Welcome screen se **Login** choose kare.  
  2. Registered mobile/email se OTP ya password based flow (jaisa app me configured hai) complete kare.  
  3. Login successful → seedha **Task Home** (Home screen) pe land karega.

---

## 2. Task Home (Volunteer Dashboard)

Is screen par volunteer:

- Upar **profile completion card** dekhta hai (kitna profile complete hai).
- Middle me **surveys / special announcements** ka section (agar active survey hai).
- Niche **Available Tasks** ke cards hote hain:
  - **Nasha Viruddh Yuddh**
  - **Harr Sirr te Chatt**
  - **Sukh-Dukh Saanjha Karo**
  - **Sunwai (Complaints)**
  - **Road Condition Report**
  - **Outdoor Advertisement**
  - **Gov School Work**
  - **Appointment Request**
  - + dynamic tasks (agar admin ne SDUI se banaye hon)

Har card par click karne se **us feature ka flow start** hota hai.

---

## 3. Common pattern – zyaadatar tasks ka flow

Zyaadatar tasks (HSTC, SDSK, Sunwai, Road, Outdoor Ad, Gov School, Appointment) ka **basic pattern same** hai:

1. **Description screen**
   - Upar heading + 3 language me short explanation (English / Hindi / Punjabi).
   - Neeche “Start / New …” type ka button.

2. **Mobile verification step (agar required ho)**
   - Volunteer apna ya kisi responsible person ka **10 digit mobile number** daalta hai.
   - **Send OTP** button → OTP SMS aata hai.
   - OTP enter karke **Verify** karna hota hai.
   - Sahi hone par **“Mobile Verified”** badge/line dikhai deti hai.

3. **Unit selection (village / ward)**
   - `UnitSelector` component open hota hai:
     - Upar heading: **Select Unit (Village/Ward)**.
     - Search box: “Search villages/wards…”.
     - List me **Village Name + Block** dikhte hain.
   - Volunteer **ek unit select** karta hai → agla step auto open hota hai (kuch tasks me “Continue” button, kuch me direct next).

4. **Main form fill karna**
   - Har feature ka apna form hota hai, lekin common cheezein:
     - **Name** / Detainee / Reporter name
     - **Mobile number** (kabhi already verified, kabhi editable)
     - **Category dropdown** (issue type / problem type)
     - **Description / Notes** (khali text area)

5. **Media upload (agar feature me hai)**
   - **Photo capture / upload**
     - Button: “Capture Photo” ya “Upload Image”.
     - Camera se le sakte hain ya gallery se choose.
   - **Audio note recording**
     - Button: “Start Recording” → audio record hota hai.
     - “Stop Recording” → play / delete options.
   - **Video (optional)** – jaise Road me short video.

6. **Location capture (important)**
   - Do tareeke:
     - **Current location** button → GPS se automatic lat/long.
     - **Map pin** – Google Map khulta hai; volunteer pin drag karke sahi jagah pe rakh sakta hai.
   - Kuch tasks (Outdoor Ad, Road) me map ka special use:
     - Outdoor Ad: **wall location** pin.
     - Road: **Start + End points** set karna (neeche detail).

7. **Final check + Submit**
   - Form validation: agar required field chhoot gaya to red message aata hai.
   - Sab sahi hone par **Submit** button active.
   - Submit ke baad success message:
     - “Request submitted” / “Report submitted”.
     - Option: “Submit another” ya “Go Home”.

8. **My Requests / Journey (jahaan applicable ho)**
   - Screen me user apni purani requests dekh sakta hai:
     - Status: **Pending / Accepted / In Progress / Completed / Rejected**, etc.
     - **Admin notes & timeline** (Sunwai, Gov School, Appointments, Road jaisi features me).

---

## 4. Feature-wise detail flows

### 4.1 Nasha Viruddh Yuddh (NVY) – Drug reporting

- **Drop-downs / choices**
  - **Unit (village/ward)** – jahan nasha ho raha hai.
- **Flow**
  1. NVY card → description padhe → “Start”.
  2. Unit select kare.
  3. Form:
     - Description: kya ho raha hai, kab, kis type ka nasha.
     - Photo (optional but recommended).
     - Audio note (optional).
     - Location:
       - Current location button ya map pin.
  4. Submit.
- **Important training point**
  - **Report user history me nahi dikhegi** – sirf admin ko dikhti hai.
  - Volunteer ko batana hai: ye **pure anonymous / confidential** hai; bas admin side pe show hota hai.

---

### 4.2 Road Condition Report

- **Drop-downs / inputs**
  - **Unit (village/ward)** – jahan road kharab hai.
  - Map pe **Start point** aur **End point**.
  - System automatic **distance in km** nikalta hai.
- **Flow**
  1. Road card → description → “Start New Road Report”.
  2. **Unit selection**
     - Unit list se gaon/ward select karte hi **next step (mobile verify)** open.
  3. **Mobile OTP**
     - Apna mobile → OTP → verify.
  4. **Form**
     - Reporter name.
     - Mobile (verified).
     - Detailed description (gaddhe kahan se kahan tak, pani bharav, danger wagaira).
  5. **Media**
     - **Multiple photos** – alag‑alag angle se.
     - **Optional video** – chhota clip.
     - **Optional audio** – extra explanation.
  6. **Map – Start/End**
     - “Use Current Location” se map center ho jata hai.
     - Mode select:
       - “Select START point”.
       - “Select END point”.
     - Dono pins lagne ke baad neeche **distance (e.g. 0.85 km)** auto show hoti hai.
  7. Submit.
  8. **My Road Reports**
     - Har report ka card: unit, date, status, short text.
     - Card open karne par **Journey / Notes** timeline:
       - Submitted → Admin notes → Completed note.

---

### 4.3 Harr Sirr te Chatt (HSTC)

- **Main form cheezein**
  - Unit (village).
  - Family details: head of family, members, housing condition.
  - Income / vulnerability info.
  - Photo(s) of house.
- **Special behaviour**
  - **User apni submission ko “approved hone se pehle tak” edit kar sakta hai.**
  - Admin side se har condition me edit possible, user se permission ki zaroorat nahi.

Flow roughly:

1. HSTC description → Start.
2. Unit select.
3. Family details + photos + location.
4. Submit.
5. My HSTC → list of applications:
   - Status + “Edit” button jab tak status `pending` hai.

---

### 4.4 Sukh-Dukh Saanjha Karo (SDSK)

- **Use case**
  - Log apne dukh/sukh, mental health, support needs share karte hain.
- **Form**
  - Complainant / person name.
  - Father/husband name.
  - Mobile (optional ya verified).
  - Category (drop‑down – types of issues).
  - Detailed note.
  - Optional audio note.

Flow:

1. SDSK card → description → Start.
2. Unit + mobile OTP (if enabled).
3. Form fill + audio.
4. Submit.
5. History: previous SDSK entries with status, admin notes (if configured).

---

### 4.5 Sunwai – Complaint system

- **Drop-downs**
  - Unit.
  - Issue category (with search).
  - “Other” category text if selected.
- **Flow**
  1. Description screen → “New Complaint”.
  2. Verify mobile via OTP.
  3. Unit select.
  4. Form:
     - Name, father/husband.
     - Mobile.
     - Category selection / Other text.
     - Complaint description.
     - Optional audio.
  5. Submit.
  6. **My Complaints**
     - Har complaint card me **Journey Timeline**:
       - Submitted → Accepted → In Progress / Resolved → Notes.

---

### 4.6 Outdoor Advertisement

- **Drop-downs & choices**
  - Unit.
  - Frame type (With frame / Without frame).
- **Flow**
  1. Description → Start new submission.
  2. Unit select.
  3. Building owner mobile → OTP verify.
  4. Form:
     - Owner name.
     - Wall size (e.g. 10x20 ft).
     - Frame type drop‑down.
  5. **Wall photo capture**
     - Capture wall photo – issi se location bhi auto set ho sakti hai.
  6. Map – drag pin for exact location.
  7. Submit.
  8. Baad me jab poster lag jaye to:
     - Same submission pe **poster photo upload** option.

---

### 4.7 Gov School Work

- **Drop-downs**
  - Unit.
  - Issue categories (multiple select).
- **Flow**
  1. Gov School card → description → Start.
  2. Unit select.
  3. Principal / nodal volunteer mobile OTP verification (dono ke liye alag OTP possible).
  4. Form:
     - School name, principal name + mobile.
     - Nodal volunteer name + mobile.
     - Issue categories (multi‑select).
     - Description.
     - Optional audio.
     - Location (map).
  5. Submit.
  6. **Journey timeline** exactly Sunwai jaisi:
     - Submitted → Accepted → Resolved with notes; user side pe sari entries dikhengi.

---

### 4.8 Appointment Request

- **Use case**
  - Log kisi leader / office bearer se milne ka time book karte hain.
- **Flow**
  1. Appointment card → description.
  2. Unit select (jahan se request aa rahi hai).
  3. Mobile OTP verify.
  4. Form:
     - Person name, father/husband.
     - Mobile.
     - Address.
     - Reason for appointment (description).
     - Document photo (optional).
  5. Submit.
  6. **My Appointments**
     - Status: Pending → Scheduled (with date/time) → Resolved.
     - Journey timeline: submitted, scheduled note, final resolution note.

---

## 5. Training tips (trainer ke liye)

- **Language switcher dikhana zaroori**  
  - Har volunteer ko batayein ki app **English / Hindi / Punjabi** me available hai.

- **OTP misuse se bachav**  
  - Volunteers ko samjhaayein ki **OTP kisi ke saath share na karein**.  
  - Kisi aur ke mobile se form bhar rahe ho to unki permission jarur len.

- **Location importance**  
  - NVY, Road, Outdoor Ad, Gov School jaise tasks me **location sabse critical** hai.  
  - Training me demo dikhayein: current location + map pin drag.

- **Media quality**  
  - Photo hamesha **clear, day light** me lein.  
  - Video chhota rakhein (network slow ho sakta hai).

- **Follow-up culture**  
  - Volunteers ko “My Requests / My Reports” section regularly check karne ko bolen, taaki unhe pata rahe ki admin ne kya action liya.

