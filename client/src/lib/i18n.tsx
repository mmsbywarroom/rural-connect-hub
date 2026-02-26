import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "en" | "hi" | "pa";

const translations = {
  patialaRural: { en: "Patiala Rural", hi: "पटियाला ग्रामीण", pa: "ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
  login: { en: "Login", hi: "लॉगिन", pa: "ਲੌਗਇਨ" },
  register: { en: "Register", hi: "रजिस्टर", pa: "ਰਜਿਸਟਰ" },
  logout: { en: "Logout", hi: "लॉग आउट", pa: "ਲੌਗ ਆਉਟ" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  next: { en: "Next", hi: "अगला", pa: "ਅਗਲਾ" },
  submit: { en: "Submit", hi: "जमा करें", pa: "ਜਮ੍ਹਾਂ ਕਰੋ" },
  save: { en: "Save", hi: "सहेजें", pa: "ਸੇਵ ਕਰੋ" },
  cancel: { en: "Cancel", hi: "रद्द करें", pa: "ਰੱਦ ਕਰੋ" },
  loading: { en: "Loading...", hi: "लोड हो रहा है...", pa: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  search: { en: "Search", hi: "खोजें", pa: "ਖੋਜੋ" },
  change: { en: "Change", hi: "बदलें", pa: "ਬਦਲੋ" },
  mobileNumber: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  enterMobile: { en: "Enter 10-digit mobile", hi: "10 अंकों का मोबाइल नंबर दर्ज करें", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobileNumber: { en: "Enter 10-digit mobile number", hi: "10 अंकों का मोबाइल नंबर दर्ज करें", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterValidMobile: { en: "Please enter a valid 10-digit mobile number", hi: "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें", pa: "ਕਿਰਪਾ ਕਰਕੇ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter OTP", hi: "OTP दर्ज करें", pa: "OTP ਦਰਜ ਕਰੋ" },
  enter4DigitOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyAndContinue: { en: "Verify & Continue", hi: "सत्यापित करें और जारी रखें", pa: "ਤਸਦੀਕ ਕਰੋ ਅਤੇ ਜਾਰੀ ਰੱਖੋ" },
  otpSent: { en: "OTP Sent", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpSentDesc: { en: "Please enter the OTP sent to your mobile", hi: "कृपया अपने मोबाइल पर भेजा गया OTP दर्ज करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਮੋਬਾਈਲ 'ਤੇ ਭੇਜਿਆ OTP ਦਰਜ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  demoOtp: { en: "Your OTP:", hi: "आपका OTP:", pa: "ਤੁਹਾਡਾ OTP:" },
  invalidMobile: { en: "Enter a valid 10-digit mobile number", hi: "एक वैध 10 अंकों का मोबाइल नंबर दर्ज करें", pa: "ਇੱਕ ਵੈਧ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  invalidOtp: { en: "Enter a 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  invalidOrExpiredOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  error: { en: "Error", hi: "त्रुटि", pa: "ਗਲਤੀ" },
  invalid: { en: "Invalid", hi: "अमान्य", pa: "ਅਵੈਧ" },
  required: { en: "Required", hi: "आवश्यक", pa: "ਲੋੜੀਂਦਾ" },
  backToLogin: { en: "Back to Login", hi: "लॉगिन पर वापस", pa: "ਲੌਗਇਨ 'ਤੇ ਵਾਪਸ" },
  notRegistered: { en: "Not Registered", hi: "पंजीकृत नहीं है", pa: "ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ" },
  notRegisteredDesc: { en: "This mobile number is not registered. Please use the Register option.", hi: "यह मोबाइल नंबर पंजीकृत नहीं है। कृपया रजिस्टर विकल्प का उपयोग करें।", pa: "ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਰਜਿਸਟਰ ਵਿਕਲਪ ਵਰਤੋ।" },
  alreadyRegistered: { en: "Already registered", hi: "पहले से पंजीकृत", pa: "ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ" },
  alreadyRegisteredDesc: { en: "You are already registered. Logged in successfully.", hi: "आप पहले से पंजीकृत हैं। सफलतापूर्वक लॉगिन हुआ।", pa: "ਤੁਸੀਂ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੋ। ਸਫਲਤਾਪੂਰਵਕ ਲੌਗਇਨ ਹੋ ਗਿਆ।" },
  selectYourUnit: { en: "Select Your Home Unit", hi: "अपनी होम यूनिट चुनें", pa: "ਆਪਣੀ ਘਰੇਲੂ ਯੂਨਿਟ ਚੁਣੋ" },
  chooseVillageOrWard: { en: "The unit where you live - choose your village or ward", hi: "जिस यूनिट में आप रहते हैं - अपना गांव या वार्ड चुनें", pa: "ਜਿਸ ਯੂਨਿਟ ਵਿੱਚ ਤੁਸੀਂ ਰਹਿੰਦੇ ਹੋ - ਆਪਣਾ ਪਿੰਡ ਜਾਂ ਵਾਰਡ ਚੁਣੋ" },
  userAlreadyExists: { en: "User Already Exists", hi: "उपयोगकर्ता पहले से मौजूद है", pa: "ਉਪਭੋਗਤਾ ਪਹਿਲਾਂ ਹੀ ਮੌਜੂਦ ਹੈ" },
  userAlreadyExistsDesc: { en: "This mobile number is already registered. Please go back and login instead.", hi: "यह मोबाइल नंबर पहले से पंजीकृत है। कृपया वापस जाएं और लॉगिन करें।", pa: "ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਵਾਪਸ ਜਾਓ ਅਤੇ ਲੌਗਇਨ ਕਰੋ।" },
  goToLogin: { en: "Go to Login", hi: "लॉगिन पर जाएं", pa: "ਲੌਗਇਨ 'ਤੇ ਜਾਓ" },
  villageWard: { en: "Village / Ward", hi: "गांव / वार्ड", pa: "ਪਿੰਡ / ਵਾਰਡ" },
  selectVillageWard: { en: "Select village / ward", hi: "गांव / वार्ड चुनें", pa: "ਪਿੰਡ / ਵਾਰਡ ਚੁਣੋ" },
  registerVerifyMobile: { en: "Register - Verify Mobile", hi: "रजिस्टर - मोबाइल सत्यापित करें", pa: "ਰਜਿਸਟਰ - ਮੋਬਾਈਲ ਤਸਦੀਕ ਕਰੋ" },
  registration: { en: "Registration", hi: "पंजीकरण", pa: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ" },
  mobile: { en: "Mobile", hi: "मोबाइल", pa: "ਮੋਬਾਈਲ" },
  unit: { en: "Unit", hi: "यूनिट", pa: "ਯੂਨਿਟ" },
  selectYourRole: { en: "Select your role", hi: "अपनी भूमिका चुनें", pa: "ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ" },
  volunteer: { en: "Volunteer", hi: "स्वयंसेवक", pa: "ਵਲੰਟੀਅਰ" },
  partyPostHolder: { en: "Party Post Holder", hi: "पार्टी पद धारक", pa: "ਪਾਰਟੀ ਅਹੁਦੇਦਾਰ" },
  govtPostHolder: { en: "Govt. Post Holder", hi: "सरकारी पद धारक", pa: "ਸਰਕਾਰੀ ਅਹੁਦੇਦਾਰ" },
  selectRoleType: { en: "Select your role type", hi: "अपनी भूमिका का प्रकार चुनें", pa: "ਆਪਣੀ ਭੂਮਿਕਾ ਦੀ ਕਿਸਮ ਚੁਣੋ" },
  govtPosition: { en: "Govt Position", hi: "सरकारी पद", pa: "ਸਰਕਾਰੀ ਅਹੁਦਾ" },
  selectGovtPosition: { en: "Select govt position", hi: "सरकारी पद चुनें", pa: "ਸਰਕਾਰੀ ਅਹੁਦਾ ਚੁਣੋ" },
  jurisdictionUnits: { en: "Units of Jurisdiction", hi: "अधिकार क्षेत्र की इकाइयाँ", pa: "ਅਧਿਕਾਰ ਖੇਤਰ ਦੀਆਂ ਇਕਾਈਆਂ" },
  selectJurisdictionUnits: { en: "Select units of jurisdiction", hi: "अधिकार क्षेत्र की इकाइयाँ चुनें", pa: "ਅਧਿਕਾਰ ਖੇਤਰ ਦੀਆਂ ਇਕਾਈਆਂ ਚੁਣੋ" },
  unitsSelected: { en: "units selected", hi: "इकाइयाँ चुनी गईं", pa: "ਇਕਾਈਆਂ ਚੁਣੀਆਂ ਗਈਆਂ" },
  selectAll: { en: "Select All", hi: "सभी चुनें", pa: "ਸਭ ਚੁਣੋ" },
  clearAll: { en: "Clear All", hi: "सभी हटाएं", pa: "ਸਭ ਹਟਾਓ" },
  switchWarning: { en: "Switching will clear role-specific fields", hi: "स्विच करने से भूमिका-विशिष्ट फ़ील्ड साफ़ हो जाएंगे", pa: "ਸਵਿੱਚ ਕਰਨ ਨਾਲ ਭੂਮਿਕਾ-ਵਿਸ਼ੇਸ਼ ਖੇਤਰ ਸਾਫ਼ ਹੋ ਜਾਣਗੇ" },
  bothRoles: { en: "Both", hi: "दोनों", pa: "ਦੋਵੇਂ" },
  govtPostHolderDetails: { en: "Govt. Post Holder Details", hi: "सरकारी पद धारक विवरण", pa: "ਸਰਕਾਰੀ ਅਹੁਦੇਦਾਰ ਵੇਰਵੇ" },
  partyPostHolderDetails: { en: "Party Post Holder Details", hi: "पार्टी पद धारक विवरण", pa: "ਪਾਰਟੀ ਅਹੁਦੇਦਾਰ ਵੇਰਵੇ" },
  atLeastOneUnit: { en: "Please select at least one unit", hi: "कृपया कम से कम एक इकाई चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਇਕਾਈ ਚੁਣੋ" },
  govtPositionRequired: { en: "Please select a govt position", hi: "कृपया सरकारी पद चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਸਰਕਾਰੀ ਅਹੁਦਾ ਚੁਣੋ" },
  noResults: { en: "No results found", hi: "कोई परिणाम नहीं मिला", pa: "ਕੋਈ ਨਤੀਜੇ ਨਹੀਂ ਮਿਲੇ" },
  yourName: { en: "Your Name", hi: "आपका नाम", pa: "ਤੁਹਾਡਾ ਨਾਂ" },
  enterFullName: { en: "Enter your full name", hi: "अपना पूरा नाम दर्ज करें", pa: "ਆਪਣਾ ਪੂਰਾ ਨਾਂ ਦਰਜ ਕਰੋ" },
  aadhaarCardPhoto: { en: "Aadhaar Card Photo", hi: "आधार कार्ड फोटो", pa: "ਆਧਾਰ ਕਾਰਡ ਫੋਟੋ" },
  voterIdPhoto: { en: "Voter ID Photo", hi: "वोटर आईडी फोटो", pa: "ਵੋਟਰ ਆਈਡੀ ਫੋਟੋ" },
  optional: { en: "Optional", hi: "वैकल्पिक", pa: "ਵਿਕਲਪਿਕ" },
  front: { en: "Front", hi: "सामने", pa: "ਅੱਗੇ" },
  frontDone: { en: "Front Done", hi: "सामने हो गया", pa: "ਅੱਗੇ ਹੋ ਗਿਆ" },
  backSide: { en: "Back", hi: "पीछे", pa: "ਪਿੱਛੇ" },
  backDone: { en: "Back Done", hi: "पीछे हो गया", pa: "ਪਿੱਛੇ ਹੋ ਗਿਆ" },
  reading: { en: "Reading...", hi: "पढ़ रहा है...", pa: "ਪੜ੍ਹ ਰਿਹਾ ਹੈ..." },
  camera: { en: "Camera", hi: "कैमरा", pa: "ਕੈਮਰਾ" },
  gallery: { en: "Upload", hi: "अपलोड", pa: "ਅੱਪਲੋਡ" },
  enterNameRequired: { en: "Please enter your name", hi: "कृपया अपना नाम दर्ज करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਂ ਦਰਜ ਕਰੋ" },
  currentPosition: { en: "Current Position", hi: "वर्तमान पद", pa: "ਮੌਜੂਦਾ ਅਹੁਦਾ" },
  enterPosition: { en: "Enter your position", hi: "अपना पद दर्ज करें", pa: "ਆਪਣਾ ਅਹੁਦਾ ਦਰਜ ਕਰੋ" },
  voterIdNumber: { en: "Voter ID", hi: "वोटर आईडी", pa: "ਵੋਟਰ ਆਈਡੀ" },
  enterVoterId: { en: "Enter Voter ID number", hi: "वोटर आईडी नंबर दर्ज करें", pa: "ਵੋਟਰ ਆਈਡੀ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  aadhaarNumber: { en: "Aadhaar Number", hi: "आधार नंबर", pa: "ਆਧਾਰ ਨੰਬਰ" },
  enterAadhaar: { en: "Enter 12-digit Aadhaar number", hi: "12 अंकों का आधार नंबर दर्ज करें", pa: "12 ਅੰਕਾਂ ਦਾ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  level: { en: "Level", hi: "स्तर", pa: "ਪੱਧਰ" },
  selectLevel: { en: "Select level", hi: "स्तर चुनें", pa: "ਪੱਧਰ ਚੁਣੋ" },
  mappedArea: { en: "Mapped Area", hi: "मैप किया गया क्षेत्र", pa: "ਮੈਪ ਕੀਤਾ ਖੇਤਰ" },
  selectArea: { en: "Select area", hi: "क्षेत्र चुनें", pa: "ਖੇਤਰ ਚੁਣੋ" },
  wing: { en: "Wing", hi: "विंग", pa: "ਵਿੰਗ" },
  selectWing: { en: "Select wing", hi: "विंग चुनें", pa: "ਵਿੰਗ ਚੁਣੋ" },
  punjabGovWing: { en: "Punjab Gov Wing", hi: "पंजाब सरकार विंग", pa: "ਪੰਜਾਬ ਸਰਕਾਰ ਵਿੰਗ" },
  selectGovWing: { en: "Select Punjab Gov Wing", hi: "पंजाब सरकार विंग चुनें", pa: "ਪੰਜਾਬ ਸਰਕਾਰ ਵਿੰਗ ਚੁਣੋ" },
  none: { en: "None", hi: "कोई नहीं", pa: "ਕੋਈ ਨਹੀਂ" },
  specifyWing: { en: "Specify Wing", hi: "विंग निर्दिष्ट करें", pa: "ਵਿੰਗ ਦੱਸੋ" },
  enterWingName: { en: "Enter wing name", hi: "विंग का नाम दर्ज करें", pa: "ਵਿੰਗ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ" },
  yourPhoto: { en: "Your Photo", hi: "आपकी फोटो", pa: "ਤੁਹਾਡੀ ਫੋਟੋ" },
  uploadPhotoRequired: { en: "Please upload your photo", hi: "कृपया अपनी फोटो अपलोड करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ" },
  photoCaptured: { en: "Photo captured", hi: "फोटो लिया गया", pa: "ਫੋਟੋ ਲਈ ਗਈ" },
  tapToCapture: { en: "Tap to capture", hi: "फोटो लेने के लिए टैप करें", pa: "ਫੋਟੋ ਲੈਣ ਲਈ ਟੈਪ ਕਰੋ" },
  welcome: { en: "Welcome!", hi: "स्वागत है!", pa: "ਜੀ ਆਇਆਂ ਨੂੰ!" },
  registrationSuccessful: { en: "Registration successful", hi: "पंजीकरण सफल", pa: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਫਲ" },
  registrationFailed: { en: "Registration failed", hi: "पंजीकरण विफल", pa: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਅਸਫਲ" },
  alreadyRegisteredLogin: { en: "This mobile number is already registered. Please login instead.", hi: "यह मोबाइल नंबर पहले से पंजीकृत है। कृपया लॉगिन करें।", pa: "ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰਡ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਲੌਗਇਨ ਕਰੋ।" },
  availableTasks: { en: "Available Tasks", hi: "उपलब्ध कार्य", pa: "ਉਪਲਬਧ ਕੰਮ" },
  noTasks: { en: "No tasks available", hi: "कोई कार्य उपलब्ध नहीं", pa: "ਕੋਈ ਕੰਮ ਉਪਲਬਧ ਨਹੀਂ" },
  continueTask: { en: "Continue", hi: "जारी रखें", pa: "ਜਾਰੀ ਰੱਖੋ" },
  startTask: { en: "Start", hi: "शुरू करें", pa: "ਸ਼ੁਰੂ ਕਰੋ" },
  completeProfile: { en: "Complete your profile to unlock all features", hi: "सभी सुविधाओं को अनलॉक करने के लिए अपनी प्रोफ़ाइल पूरी करें", pa: "ਸਾਰੀਆਂ ਸੁਵਿਧਾਵਾਂ ਅਨਲੌਕ ਕਰਨ ਲਈ ਆਪਣੀ ਪ੍ਰੋਫ਼ਾਈਲ ਪੂਰੀ ਕਰੋ" },
  fieldsDone: { en: "fields done", hi: "फ़ील्ड पूरे", pa: "ਫੀਲਡ ਪੂਰੇ" },
  remaining: { en: "remaining", hi: "शेष", pa: "ਬਾਕੀ" },
  of: { en: "of", hi: "का", pa: "ਵਿੱਚੋਂ" },
  myProfile: { en: "My Profile", hi: "मेरी प्रोफ़ाइल", pa: "ਮੇਰੀ ਪ੍ਰੋਫ਼ਾਈਲ" },
  fieldsCompleted: { en: "fields completed", hi: "फ़ील्ड पूरे", pa: "ਫੀਲਡ ਪੂਰੇ" },
  saveProfile: { en: "Save Profile", hi: "प्रोफ़ाइल सहेजें", pa: "ਪ੍ਰੋਫ਼ਾਈਲ ਸੇਵ ਕਰੋ" },
  profileSaved: { en: "Profile saved", hi: "प्रोफ़ाइल सहेजी गई", pa: "ਪ੍ਰੋਫ਼ਾਈਲ ਸੇਵ ਹੋ ਗਈ" },
  profileUpdated: { en: "Your profile has been updated", hi: "आपकी प्रोफ़ाइल अपडेट हो गई", pa: "ਤੁਹਾਡੀ ਪ੍ਰੋਫ਼ਾਈਲ ਅੱਪਡੇਟ ਹੋ ਗਈ" },
  failedSaveProfile: { en: "Failed to save profile", hi: "प्रोफ़ाइल सहेजने में विफल", pa: "ਪ੍ਰੋਫ਼ਾਈਲ ਸੇਵ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  profileComplete: { en: "Profile Complete!", hi: "प्रोफ़ाइल पूरी!", pa: "ਪ੍ਰੋਫ਼ਾਈਲ ਪੂਰੀ!" },
  completeYourProfile: { en: "Complete Your Profile", hi: "अपनी प्रोफ़ाइल पूरी करें", pa: "ਆਪਣੀ ਪ੍ਰੋਫ਼ਾਈਲ ਪੂਰੀ ਕਰੋ" },
  nameRequired: { en: "Name is required", hi: "नाम आवश्यक है", pa: "ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ" },
  personalInformation: { en: "Personal Information", hi: "व्यक्तिगत जानकारी", pa: "ਨਿੱਜੀ ਜਾਣਕਾਰੀ" },
  fullName: { en: "Full Name", hi: "पूरा नाम", pa: "ਪੂਰਾ ਨਾਂ" },
  idDocuments: { en: "ID Documents", hi: "पहचान दस्तावेज़", pa: "ਪਛਾਣ ਦਸਤਾਵੇਜ਼" },
  roleAndAssignment: { en: "Role & Assignment", hi: "भूमिका और असाइनमेंट", pa: "ਭੂਮਿਕਾ ਅਤੇ ਅਸਾਈਨਮੈਂਟ" },
  role: { en: "Role", hi: "भूमिका", pa: "ਭੂਮਿਕਾ" },
  position: { en: "Position", hi: "पद", pa: "ਅਹੁਦਾ" },
  otherWingName: { en: "Other Wing Name", hi: "अन्य विंग का नाम", pa: "ਹੋਰ ਵਿੰਗ ਦਾ ਨਾਂ" },
  specifyWingName: { en: "Specify wing name", hi: "विंग का नाम निर्दिष्ट करें", pa: "ਵਿੰਗ ਦਾ ਨਾਂ ਦੱਸੋ" },
  addAnotherRole: { en: "Add Another Role", hi: "एक और भूमिका जोड़ें", pa: "ਇੱਕ ਹੋਰ ਭੂਮਿਕਾ ਜੋੜੋ" },
  removeRole: { en: "Remove", hi: "हटाएं", pa: "ਹਟਾਓ" },
  selectPosition: { en: "Select position", hi: "पद चुनें", pa: "ਅਹੁਦਾ ਚੁਣੋ" },
  customPosition: { en: "Custom Position", hi: "कस्टम पद", pa: "ਕਸਟਮ ਅਹੁਦਾ" },
  enterCustomPosition: { en: "Enter custom position", hi: "कस्टम पद दर्ज करें", pa: "ਕਸਟਮ ਅਹੁਦਾ ਦਰਜ ਕਰੋ" },
  primaryRole: { en: "Primary Role", hi: "प्राथमिक भूमिका", pa: "ਪ੍ਰਾਇਮਰੀ ਭੂਮਿਕਾ" },
  additionalRole: { en: "Additional Role", hi: "अतिरिक्त भूमिका", pa: "ਵਾਧੂ ਭੂਮਿਕਾ" },
  roleAssignment: { en: "Role Assignment", hi: "भूमिका असाइनमेंट", pa: "ਭੂਮਿਕਾ ਅਸਾਈਨਮੈਂਟ" },
  roleAssignmentRequired: { en: "Please fill Wing, Position and Level for the primary role", hi: "कृपया प्राथमिक भूमिका के लिए विंग, पद और स्तर भरें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਾਇਮਰੀ ਭੂਮਿਕਾ ਲਈ ਵਿੰਗ, ਅਹੁਦਾ ਅਤੇ ਪੱਧਰ ਭਰੋ" },
  notAssigned: { en: "Not assigned", hi: "असाइन नहीं किया गया", pa: "ਅਸਾਈਨ ਨਹੀਂ ਕੀਤਾ" },
  selfPhoto: { en: "Self Photo", hi: "सेल्फ फोटो", pa: "ਸੈਲਫ਼ ਫੋਟੋ" },
  aadhaarFront: { en: "Aadhaar Card (Front)", hi: "आधार कार्ड (सामने)", pa: "ਆਧਾਰ ਕਾਰਡ (ਅੱਗੇ)" },
  aadhaarBack: { en: "Aadhaar Card (Back)", hi: "आधार कार्ड (पीछे)", pa: "ਆਧਾਰ ਕਾਰਡ (ਪਿੱਛੇ)" },
  voterCardFront: { en: "Voter Card (Front)", hi: "वोटर कार्ड (सामने)", pa: "ਵੋਟਰ ਕਾਰਡ (ਅੱਗੇ)" },
  voterCardBack: { en: "Voter Card (Back)", hi: "वोटर कार्ड (पीछे)", pa: "ਵੋਟਰ ਕਾਰਡ (ਪਿੱਛੇ)" },
  tapToAdd: { en: "Tap to add", hi: "जोड़ने के लिए टैप करें", pa: "ਜੋੜਨ ਲਈ ਟੈਪ ਕਰੋ" },
  missing: { en: "Missing", hi: "अधूरा", pa: "ਅਧੂਰਾ" },
  selectUnit: { en: "Select Unit", hi: "यूनिट चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  chooseVillageForTask: { en: "Choose a village/ward to work in", hi: "काम करने के लिए गांव/वार्ड चुनें", pa: "ਕੰਮ ਕਰਨ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  yourVillage: { en: "Your Village", hi: "आपका गांव", pa: "ਤੁਹਾਡਾ ਪਿੰਡ" },
  searchVillages: { en: "Search villages/wards...", hi: "गांव/वार्ड खोजें...", pa: "ਪਿੰਡ/ਵਾਰਡ ਖੋਜੋ..." },
  villages: { en: "Villages", hi: "गांव", pa: "ਪਿੰਡ" },
  wards: { en: "Wards", hi: "वार्ड", pa: "ਵਾਰਡ" },
  noVillagesFound: { en: "No villages/wards found matching", hi: "कोई गांव/वार्ड नहीं मिला", pa: "ਕੋਈ ਪਿੰਡ/ਵਾਰਡ ਨਹੀਂ ਮਿਲਿਆ" },
  switchUnit: { en: "Switch", hi: "बदलें", pa: "ਬਦਲੋ" },
  yourSubmissions: { en: "Your submissions in this unit", hi: "इस यूनिट में आपकी जमा", pa: "ਇਸ ਯੂਨਿਟ ਵਿੱਚ ਤੁਹਾਡੇ ਜਮ੍ਹਾਂ" },
  more: { en: "more", hi: "और", pa: "ਹੋਰ" },
  submitted: { en: "Submitted", hi: "जमा किया", pa: "ਜਮ੍ਹਾਂ ਕੀਤਾ" },
  cscCampReport: { en: "CSC / Camp Report", hi: "CSC / कैम्प रिपोर्ट", pa: "CSC / ਕੈਂਪ ਰਿਪੋਰਟ" },
  selectCscCamp: { en: "Select CSC / Camp", hi: "CSC / कैम्प चुनें", pa: "CSC / ਕੈਂਪ ਚੁਣੋ" },
  addNewCsc: { en: "Add New CSC / Camp", hi: "नया CSC / कैम्प जोड़ें", pa: "ਨਵਾਂ CSC / ਕੈਂਪ ਜੋੜੋ" },
  newCscName: { en: "New CSC / Camp Name", hi: "नए CSC / कैम्प का नाम", pa: "ਨਵੇਂ CSC / ਕੈਂਪ ਦਾ ਨਾਂ" },
  enterName: { en: "Enter name...", hi: "नाम दर्ज करें...", pa: "ਨਾਂ ਦਰਜ ਕਰੋ..." },
  noCscFound: { en: "No CSC/Camp found for this unit. Add one below.", hi: "इस यूनिट के लिए कोई CSC/कैम्प नहीं मिला। नीचे जोड़ें।", pa: "ਇਸ ਯੂਨਿਟ ਲਈ ਕੋਈ CSC/ਕੈਂਪ ਨਹੀਂ ਮਿਲਿਆ। ਹੇਠਾਂ ਜੋੜੋ।" },
  markStatus: { en: "Mark Status", hi: "स्थिति चिन्हित करें", pa: "ਸਥਿਤੀ ਮਾਰਕ ਕਰੋ" },
  working: { en: "Working", hi: "काम कर रहा है", pa: "ਕੰਮ ਕਰ ਰਿਹਾ ਹੈ" },
  notWorking: { en: "Not Working", hi: "काम नहीं कर रहा", pa: "ਕੰਮ ਨਹੀਂ ਕਰ ਰਿਹਾ" },
  reason: { en: "Reason", hi: "कारण", pa: "ਕਾਰਨ" },
  selectReason: { en: "Why is it not working?", hi: "यह काम क्यों नहीं कर रहा?", pa: "ਇਹ ਕੰਮ ਕਿਉਂ ਨਹੀਂ ਕਰ ਰਿਹਾ?" },
  submitReport: { en: "Submit Report", hi: "रिपोर्ट जमा करें", pa: "ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਕਰੋ" },
  reportSubmitted: { en: "Report Submitted!", hi: "रिपोर्ट जमा हो गई!", pa: "ਰਿਪੋਰਟ ਜਮ੍ਹਾਂ ਹੋ ਗਈ!" },
  reportSaved: { en: "CSC report has been saved successfully", hi: "CSC रिपोर्ट सफलतापूर्वक सहेजी गई", pa: "CSC ਰਿਪੋਰਟ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ" },
  submitAnother: { en: "Submit Another", hi: "एक और जमा करें", pa: "ਇੱਕ ਹੋਰ ਜਮ੍ਹਾਂ ਕਰੋ" },
  goToHome: { en: "Go to Home", hi: "होम पर जाएं", pa: "ਹੋਮ 'ਤੇ ਜਾਓ" },
  closed: { en: "Closed", hi: "बंद", pa: "ਬੰਦ" },
  equipmentIssue: { en: "Equipment Issue", hi: "उपकरण समस्या", pa: "ਉਪਕਰਨ ਸਮੱਸਿਆ" },
  serverIssue: { en: "Server Issue", hi: "सर्वर समस्या", pa: "ਸਰਵਰ ਸਮੱਸਿਆ" },
  technicalIssue: { en: "Technical Issue", hi: "तकनीकी समस्या", pa: "ਤਕਨੀਕੀ ਸਮੱਸਿਆ" },
  other: { en: "Other", hi: "अन्य", pa: "ਹੋਰ" },
  volunteerMapping: { en: "Volunteer Mapping", hi: "स्वयंसेवक मैपिंग", pa: "ਵਲੰਟੀਅਰ ਮੈਪਿੰਗ" },
  supporterMapping: { en: "Supporter Mapping", hi: "समर्थक मैपिंग", pa: "ਸਮਰਥਕ ਮੈਪਿੰਗ" },
  name: { en: "Name", hi: "नाम", pa: "ਨਾਂ" },
  phone: { en: "Phone", hi: "फ़ोन", pa: "ਫ਼ੋਨ" },
  category: { en: "Category", hi: "श्रेणी", pa: "ਸ਼੍ਰੇਣੀ" },
  selectCategory: { en: "Select category", hi: "श्रेणी चुनें", pa: "ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  addVolunteer: { en: "Add Volunteer", hi: "स्वयंसेवक जोड़ें", pa: "ਵਲੰਟੀਅਰ ਜੋੜੋ" },
  addSupporter: { en: "Add Supporter", hi: "समर्थक जोड़ें", pa: "ਸਮਰਥਕ ਜੋੜੋ" },
  volunteerAdded: { en: "Volunteer added successfully", hi: "स्वयंसेवक सफलतापूर्वक जोड़ा गया", pa: "ਵਲੰਟੀਅਰ ਸਫਲਤਾਪੂਰਵਕ ਜੋੜਿਆ ਗਿਆ" },
  supporterAdded: { en: "Supporter added successfully", hi: "समर्थक सफलतापूर्वक जोड़ा गया", pa: "ਸਮਰਥਕ ਸਫਲਤਾਪੂਰਵਕ ਜੋੜਿਆ ਗਿਆ" },
  officePortal: { en: "Office Portal", hi: "कार्यालय पोर्टल", pa: "ਦਫ਼ਤਰ ਪੋਰਟਲ" },
  adminPanel: { en: "Admin Panel", hi: "एडमिन पैनल", pa: "ਐਡਮਿਨ ਪੈਨਲ" },
  volunteerApp: { en: "Volunteer App", hi: "स्वयंसेवक ऐप", pa: "ਵਲੰਟੀਅਰ ਐਪ" },
  manageVolunteers: { en: "Manage volunteers, tasks & analytics", hi: "स्वयंसेवकों, कार्यों और विश्लेषण का प्रबंधन करें", pa: "ਵਲੰਟੀਅਰਾਂ, ਕੰਮਾਂ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ ਦਾ ਪ੍ਰਬੰਧਨ ਕਰੋ" },
  mobileAppForField: { en: "Mobile app for field workers", hi: "फील्ड वर्कर्स के लिए मोबाइल ऐप", pa: "ਫੀਲਡ ਵਰਕਰਾਂ ਲਈ ਮੋਬਾਈਲ ਐਪ" },
  recordVisitorGrievances: { en: "Record visitor grievances", hi: "आगंतुक शिकायतें दर्ज करें", pa: "ਵਿਜ਼ਟਰ ਸ਼ਿਕਾਇਤਾਂ ਦਰਜ ਕਰੋ" },
  eachPortalIndependent: { en: "Each portal operates independently at its own URL", hi: "प्रत्येक पोर्टल अपने URL पर स्वतंत्र रूप से संचालित होता है", pa: "ਹਰ ਪੋਰਟਲ ਆਪਣੇ URL 'ਤੇ ਸੁਤੰਤਰ ਰੂਪ ਵਿੱਚ ਕੰਮ ਕਰਦਾ ਹੈ" },
  welcomeBack: { en: "Welcome Back", hi: "वापस स्वागत है", pa: "ਵਾਪਸੀ 'ਤੇ ਸੁਆਗਤ ਹੈ" },
  signInToContinue: { en: "Sign in to continue", hi: "जारी रखने के लिए साइन इन करें", pa: "ਜਾਰੀ ਰੱਖਣ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ" },
  userId: { en: "User ID", hi: "यूज़र आईडी", pa: "ਯੂਜ਼ਰ ਆਈਡੀ" },
  password: { en: "Password", hi: "पासवर्ड", pa: "ਪਾਸਵਰਡ" },
  signIn: { en: "Sign In", hi: "साइन इन", pa: "ਸਾਈਨ ਇਨ" },
  signingIn: { en: "Signing in...", hi: "साइन इन हो रहा है...", pa: "ਸਾਈਨ ਇਨ ਹੋ ਰਿਹਾ ਹੈ..." },
  loginFailed: { en: "Login failed", hi: "लॉगिन विफल", pa: "ਲੌਗਇਨ ਅਸਫਲ" },
  invalidCredentials: { en: "Invalid credentials", hi: "अमान्य क्रेडेंशियल", pa: "ਅਵੈਧ ਕ੍ਰੈਡੈਂਸ਼ੀਅਲ" },
  grievanceEntry: { en: "Grievance Entry", hi: "शिकायत दर्ज", pa: "ਸ਼ਿਕਾਇਤ ਦਰਜ" },
  total: { en: "Total", hi: "कुल", pa: "ਕੁੱਲ" },
  solved: { en: "Solved", hi: "हल किया", pa: "ਹੱਲ ਕੀਤਾ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  visitorName: { en: "Visitor Name", hi: "आगंतुक का नाम", pa: "ਵਿਜ਼ਟਰ ਦਾ ਨਾਂ" },
  village: { en: "Village", hi: "गांव", pa: "ਪਿੰਡ" },
  issue: { en: "Issue", hi: "मुद्दा", pa: "ਮੁੱਦਾ" },
  add: { en: "Add", hi: "जोड़ें", pa: "ਜੋੜੋ" },
  today: { en: "Today", hi: "आज", pa: "ਅੱਜ" },
  days7: { en: "7 Days", hi: "7 दिन", pa: "7 ਦਿਨ" },
  days30: { en: "30 Days", hi: "30 दिन", pa: "30 ਦਿਨ" },
  visitors: { en: "visitors", hi: "आगंतुक", pa: "ਵਿਜ਼ਟਰ" },
  noVisitors: { en: "No visitors in this period", hi: "इस अवधि में कोई आगंतुक नहीं", pa: "ਇਸ ਸਮੇਂ ਦੌਰਾਨ ਕੋਈ ਵਿਜ਼ਟਰ ਨਹੀਂ" },
  returningVisitor: { en: "Returning Visitor", hi: "वापस आने वाला आगंतुक", pa: "ਵਾਪਸ ਆਉਣ ਵਾਲਾ ਵਿਜ਼ਟਰ" },
  previousVisits: { en: "Previous Visit(s)", hi: "पिछली मुलाकात(ें)", pa: "ਪਿਛਲੇ ਦੌਰੇ" },
  visits: { en: "visits", hi: "मुलाकातें", pa: "ਦੌਰੇ" },
  visitorAdded: { en: "Visitor Added", hi: "आगंतुक जोड़ा गया", pa: "ਵਿਜ਼ਟਰ ਜੋੜਿਆ ਗਿਆ" },
  failed: { en: "Failed", hi: "विफल", pa: "ਅਸਫਲ" },
  updated: { en: "Updated", hi: "अपडेट किया", pa: "ਅੱਪਡੇਟ ਕੀਤਾ" },
  update: { en: "Update", hi: "अपडेट", pa: "ਅੱਪਡੇਟ" },
  department: { en: "Department", hi: "विभाग", pa: "ਵਿਭਾਗ" },
  selectDepartment: { en: "Select department", hi: "विभाग चुनें", pa: "ਵਿਭਾਗ ਚੁਣੋ" },
  status: { en: "Status", hi: "स्थिति", pa: "ਸਥਿਤੀ" },
  whyPending: { en: "Why is it pending?", hi: "यह लंबित क्यों है?", pa: "ਇਹ ਬਕਾਇਆ ਕਿਉਂ ਹੈ?" },
  saveChanges: { en: "Save Changes", hi: "बदलाव सहेजें", pa: "ਬਦਲਾਅ ਸੇਵ ਕਰੋ" },
  saving: { en: "Saving...", hi: "सहेज रहा है...", pa: "ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ..." },
  searchVillage: { en: "Search village...", hi: "गांव खोजें...", pa: "ਪਿੰਡ ਖੋਜੋ..." },
  selectVillage: { en: "Select Village/Ward", hi: "गांव/वार्ड चुनें", pa: "ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  noVillageFound: { en: "No village found.", hi: "कोई गांव नहीं मिला।", pa: "ਕੋਈ ਪਿੰਡ ਨਹੀਂ ਮਿਲਿਆ।" },
  email: { en: "Email", hi: "ईमेल", pa: "ਈਮੇਲ" },
  enterEmail: { en: "Enter email address", hi: "ईमेल पता दर्ज करें", pa: "ਈਮੇਲ ਪਤਾ ਦਰਜ ਕਰੋ" },
  mobileCannotChange: { en: "Mobile number cannot be changed (used for login)", hi: "मोबाइल नंबर बदला नहीं जा सकता (लॉगिन के लिए उपयोग होता है)", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਬਦਲਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ (ਲੌਗਇਨ ਲਈ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ)" },
  selectRole: { en: "Select Role", hi: "भूमिका चुनें", pa: "ਭੂਮਿਕਾ ਚੁਣੋ" },
  language: { en: "Language", hi: "भाषा", pa: "ਭਾਸ਼ਾ" },
  english: { en: "English", hi: "English", pa: "English" },
  hindi: { en: "हिन्दी", hi: "हिन्दी", pa: "हिन्दी" },
  punjabi: { en: "ਪੰਜਾਬੀ", hi: "ਪੰਜਾਬੀ", pa: "ਪੰਜਾਬੀ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  block: { en: "Block", hi: "ब्लॉक", pa: "ਬਲਾਕ" },
  chooseVillageForCsc: { en: "Choose a village/ward for CSC report", hi: "CSC रिपोर्ट के लिए गांव/वार्ड चुनें", pa: "CSC ਰਿਪੋਰਟ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  taskSubmitted: { en: "Task submitted successfully", hi: "कार्य सफलतापूर्वक जमा हो गया", pa: "ਕੰਮ ਸਫਲਤਾਪੂਰਵਕ ਜਮ੍ਹਾਂ ਹੋ ਗਿਆ" },
  failedSubmitTask: { en: "Failed to submit task", hi: "कार्य जमा करने में विफल", pa: "ਕੰਮ ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  chooseVillageForVolunteer: { en: "Choose a village/ward for volunteer mapping", hi: "स्वयंसेवक मैपिंग के लिए गांव/वार्ड चुनें", pa: "ਵਲੰਟੀਅਰ ਮੈਪਿੰਗ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  chooseVillageForSupporter: { en: "Choose a village/ward for supporter mapping", hi: "समर्थक मैपिंग के लिए गांव/वार्ड चुनें", pa: "ਸਮਰਥਕ ਮੈਪਿੰਗ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  failedAddVolunteer: { en: "Failed to add volunteer", hi: "स्वयंसेवक जोड़ने में विफल", pa: "ਵਲੰਟੀਅਰ ਜੋੜਨ ਵਿੱਚ ਅਸਫਲ" },
  failedAddSupporter: { en: "Failed to add supporter", hi: "समर्थक जोड़ने में विफल", pa: "ਸਮਰਥਕ ਜੋੜਨ ਵਿੱਚ ਅਸਫਲ" },
  success: { en: "Success", hi: "सफल", pa: "ਸਫਲ" },
  supporterName: { en: "Supporter Name", hi: "समर्थक का नाम", pa: "ਸਮਰਥਕ ਦਾ ਨਾਂ" },
  volunteerName: { en: "Volunteer Name", hi: "स्वयंसेवक का नाम", pa: "ਵਲੰਟੀਅਰ ਦਾ ਨਾਂ" },
  enterPhoneNumber: { en: "Enter phone number", hi: "फोन नंबर दर्ज करें", pa: "ਫ਼ੋਨ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterSupporterName: { en: "Enter supporter name", hi: "समर्थक का नाम दर्ज करें", pa: "ਸਮਰਥਕ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ" },
  enterVolunteerName: { en: "Enter volunteer name", hi: "स्वयंसेवक का नाम दर्ज करें", pa: "ਵਲੰਟੀਅਰ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ" },
  pageNotFound: { en: "404 Page Not Found", hi: "404 पेज नहीं मिला", pa: "404 ਪੰਨਾ ਨਹੀਂ ਮਿਲਿਆ" },
  didNotFindPage: { en: "Did not find the page you're looking for.", hi: "आप जो पेज ढूंढ रहे हैं वह नहीं मिला।", pa: "ਤੁਸੀਂ ਜੋ ਪੰਨਾ ਲੱਭ ਰਹੇ ਹੋ ਉਹ ਨਹੀਂ ਮਿਲਿਆ।" },
  goHome: { en: "Go to Homepage", hi: "होमपेज पर जाएं", pa: "ਹੋਮਪੇਜ 'ਤੇ ਜਾਓ" },
  confirmUnit: { en: "Confirm Unit", hi: "यूनिट की पुष्टि करें", pa: "ਯੂਨਿਟ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ" },
  confirmUnitMessage: { en: "You have selected the following unit:", hi: "आपने निम्न यूनिट चुनी है:", pa: "ਤੁਸੀਂ ਹੇਠ ਲਿਖੀ ਯੂਨਿਟ ਚੁਣੀ ਹੈ:" },
  proceedWithUnit: { en: "Proceed", hi: "आगे बढ़ें", pa: "ਅੱਗੇ ਵਧੋ" },
  changeUnit: { en: "Change", hi: "बदलें", pa: "ਬਦਲੋ" },
} as const;

const dynamicTranslations: Record<string, { hi: string; pa: string }> = {
  "Youth Wing": { hi: "युवा विंग", pa: "ਯੂਥ ਵਿੰਗ" },
  "Women Wing": { hi: "महिला विंग", pa: "ਮਹਿਲਾ ਵਿੰਗ" },
  "Farmer Wing": { hi: "किसान विंग", pa: "ਕਿਸਾਨ ਵਿੰਗ" },
  "Senior Citizen Wing": { hi: "वरिष्ठ नागरिक विंग", pa: "ਸੀਨੀਅਰ ਸਿਟੀਜ਼ਨ ਵਿੰਗ" },
  "Student Wing": { hi: "छात्र विंग", pa: "ਵਿਦਿਆਰਥੀ ਵਿੰਗ" },
  "President": { hi: "अध्यक्ष", pa: "ਪ੍ਰਧਾਨ" },
  "Vice President": { hi: "उपाध्यक्ष", pa: "ਉਪ ਪ੍ਰਧਾਨ" },
  "Secretary": { hi: "सचिव", pa: "ਸਕੱਤਰ" },
  "Joint Secretary": { hi: "संयुक्त सचिव", pa: "ਸਾਂਝਾ ਸਕੱਤਰ" },
  "Treasurer": { hi: "कोषाध्यक्ष", pa: "ਖਜ਼ਾਨਚੀ" },
  "Member": { hi: "सदस्य", pa: "ਮੈਂਬਰ" },
  "Coordinator": { hi: "समन्वयक", pa: "ਕੋਆਰਡੀਨੇਟਰ" },
  "State": { hi: "राज्य", pa: "ਰਾਜ" },
  "Zone": { hi: "ज़ोन", pa: "ਜ਼ੋਨ" },
  "District": { hi: "ज़िला", pa: "ਜ਼ਿਲ੍ਹਾ" },
  "Halka": { hi: "हल्का", pa: "ਹਲਕਾ" },
  "Block": { hi: "ब्लॉक", pa: "ਬਲਾਕ" },
  "Village/Ward": { hi: "गांव/वार्ड", pa: "ਪਿੰਡ/ਵਾਰਡ" },
  "Post Holder": { hi: "पद धारक", pa: "ਅਹੁਦੇਦਾਰ" },
  "Volunteer": { hi: "स्वयंसेवक", pa: "ਵਲੰਟੀਅਰ" },
  "Other": { hi: "अन्य", pa: "ਹੋਰ" },
  "None": { hi: "कोई नहीं", pa: "ਕੋਈ ਨਹੀਂ" },
  "Patiala Rural": { hi: "पटियाला ग्रामीण", pa: "ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
  "Malwa East": { hi: "मालवा पूर्व", pa: "ਮਾਲਵਾ ਪੂਰਬ" },
  "Working": { hi: "काम कर रहा है", pa: "ਕੰਮ ਕਰ ਰਿਹਾ ਹੈ" },
  "Not Working": { hi: "काम नहीं कर रहा", pa: "ਕੰਮ ਨਹੀਂ ਕਰ ਰਿਹਾ" },
  "Ward": { hi: "वार्ड", pa: "ਵਾਰਡ" },
  "Village": { hi: "गांव", pa: "ਪਿੰਡ" },
};

export function translateDynamic(text: string | null | undefined, language: Language): string {
  if (!text) return "";
  if (language === "en") return text;
  const entry = dynamicTranslations[text];
  if (entry) {
    return language === "hi" ? entry.hi : entry.pa;
  }
  return text;
}

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const LANG_STORAGE_KEY = "app_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === "en" || stored === "hi" || stored === "pa") return stored;
    } catch {}
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = language === "pa" ? "pa" : language === "hi" ? "hi" : "en";
  }, [language]);

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.en;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

export const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string }[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
];

export function getLocalizedText(
  language: Language,
  base: string | null | undefined,
  hi?: string | null,
  pa?: string | null
): string {
  if (language === "hi" && hi) return hi;
  if (language === "pa" && pa) return pa;
  return base || "";
}
