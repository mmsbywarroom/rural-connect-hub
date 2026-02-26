import { db } from "./db";
import {
  villages, issues, wings, positions, departments, leadershipFlags, volunteers, officeManagers, cscs,
  taskConfigs, formFields, fieldOptions, users
} from "@shared/schema";

export async function seedDatabase() {
  try {
    const existingVillages = await db.select().from(villages);
    const existingTasks = await db.select().from(taskConfigs);

    const existingAdmins = await db.select().from(users);
    if (existingAdmins.length === 0) {
      console.log("Creating default admin user...");
      await db.insert(users).values({
        username: "9625692122",
        password: "123456",
        role: "admin",
      });
      console.log("Default admin user created.");
    }

    if (existingVillages.length > 0 && existingTasks.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    if (existingVillages.length === 0) {
      console.log("Seeding base data...");

      const villageData = [
        { name: "Bhangala" },
        { name: "Banur" },
        { name: "Rajpura" },
        { name: "Zirakpur" },
        { name: "Samana" },
        { name: "Patran" },
        { name: "Nabha" },
        { name: "Ghanaur" },
        { name: "Sirhind" },
        { name: "Fatehgarh Sahib" },
      ];
      await db.insert(villages).values(villageData);

      const issueData = [
        { name: "Water Supply" },
        { name: "Electricity" },
        { name: "Roads & Infrastructure" },
        { name: "Health Services" },
        { name: "Education" },
        { name: "Pension Related" },
        { name: "Land Records" },
        { name: "Agriculture Support" },
        { name: "Employment" },
        { name: "Housing" },
      ];
      await db.insert(issues).values(issueData);

      const wingData = [
        { name: "Youth Wing" },
        { name: "Women Wing" },
        { name: "Farmer Wing" },
        { name: "Senior Citizen Wing" },
        { name: "Student Wing" },
      ];
      await db.insert(wings).values(wingData);

      const positionData = [
        { name: "President" },
        { name: "Vice President" },
        { name: "Secretary" },
        { name: "Joint Secretary" },
        { name: "Treasurer" },
        { name: "Member" },
        { name: "Coordinator" },
      ];
      await db.insert(positions).values(positionData);

      const departmentData = [
        { name: "Public Works Department (PWD)" },
        { name: "Punjab State Power Corporation (PSPCL)" },
        { name: "Water Supply & Sanitation" },
        { name: "Health Department" },
        { name: "Education Department" },
        { name: "Revenue Department" },
        { name: "Agriculture Department" },
        { name: "Social Welfare" },
        { name: "Rural Development" },
        { name: "Police Department" },
      ];
      await db.insert(departments).values(departmentData);

      const flagData = [
        { name: "Very Active", color: "#22c55e" },
        { name: "Active", color: "#3b82f6" },
        { name: "Moderately Active", color: "#f59e0b" },
        { name: "Less Active", color: "#ef4444" },
        { name: "Inactive", color: "#6b7280" },
      ];
      await db.insert(leadershipFlags).values(flagData);

      const insertedVillages = await db.select().from(villages);
      const insertedWings = await db.select().from(wings);
      const insertedPositions = await db.select().from(positions);
      const insertedFlags = await db.select().from(leadershipFlags);

      const volunteerData = [
        {
          name: "Gurpreet Singh",
          mobileNumber: "9876543210",
          pin: "3210",
          villageId: insertedVillages[0]?.id,
          wingId: insertedWings[0]?.id,
          positionId: insertedPositions[2]?.id,
          leadershipFlagId: insertedFlags[0]?.id,
          gender: "male",
          occupation: "Farmer",
          qualification: "Graduate",
          address: "Main Bazaar, Bhangala",
        },
        {
          name: "Harpreet Kaur",
          mobileNumber: "9876543211",
          pin: "3211",
          villageId: insertedVillages[1]?.id,
          wingId: insertedWings[1]?.id,
          positionId: insertedPositions[0]?.id,
          leadershipFlagId: insertedFlags[1]?.id,
          gender: "female",
          occupation: "Teacher",
          qualification: "M.A.",
          address: "Gandhi Nagar, Banur",
        },
        {
          name: "Manjit Singh",
          mobileNumber: "9876543212",
          pin: "3212",
          villageId: insertedVillages[2]?.id,
          wingId: insertedWings[2]?.id,
          positionId: insertedPositions[5]?.id,
          leadershipFlagId: insertedFlags[2]?.id,
          gender: "male",
          occupation: "Businessman",
          qualification: "12th Pass",
          address: "Station Road, Rajpura",
        },
      ];
      await db.insert(volunteers).values(volunteerData);

      const officeManagerData = [
        { name: "Admin User", userId: "admin", password: "1234" },
        { name: "Office Staff", userId: "office", password: "0000" },
      ];
      await db.insert(officeManagers).values(officeManagerData);

      const cscData = insertedVillages.flatMap((village) => [
        { name: `${village.name} Main CSC`, villageId: village.id },
        { name: `${village.name} Camp Office`, villageId: village.id },
      ]);
      await db.insert(cscs).values(cscData);

      console.log("Base data seeded successfully!");
    }

    if (existingTasks.length === 0) {
      console.log("Seeding task configs...");
      const taskData = [
        { name: "CSC/Camp Report", nameHi: "सीएससी/कैंप रिपोर्ट", namePa: "CSC/ਕੈਂਪ ਰਿਪੋਰਟ", description: "Report status of Common Service Centers and camp offices", descriptionHi: "सामान्य सेवा केंद्रों और कैंप कार्यालयों की स्थिति रिपोर्ट करें", descriptionPa: "ਕਾਮਨ ਸਰਵਿਸ ਸੈਂਟਰਾਂ ਅਤੇ ਕੈਂਪ ਦਫ਼ਤਰਾਂ ਦੀ ਸਥਿਤੀ ਰਿਪੋਰਟ ਕਰੋ", icon: "Building2", color: "#8b5cf6", sortOrder: 1, villageRestricted: true },
        { name: "Volunteer Mapping", nameHi: "वालंटियर मैपिंग", namePa: "ਵਲੰਟੀਅਰ ਮੈਪਿੰਗ", description: "Map and verify volunteers in the field", descriptionHi: "क्षेत्र में स्वयंसेवकों का मानचित्रण और सत्यापन करें", descriptionPa: "ਖੇਤਰ ਵਿੱਚ ਵਲੰਟੀਅਰਾਂ ਦੀ ਮੈਪਿੰਗ ਅਤੇ ਤਸਦੀਕ ਕਰੋ", icon: "Users", color: "#3b82f6", sortOrder: 2, villageRestricted: false },
        { name: "Supporter Mapping", nameHi: "समर्थक मैपिंग", namePa: "ਸਮਰਥਕ ਮੈਪਿੰਗ", description: "Add new supporters with contact and ID details", descriptionHi: "नए समर्थकों को संपर्क और आईडी विवरण के साथ जोड़ें", descriptionPa: "ਨਵੇਂ ਸਮਰਥਕਾਂ ਨੂੰ ਸੰਪਰਕ ਅਤੇ ਆਈਡੀ ਵੇਰਵਿਆਂ ਨਾਲ ਜੋੜੋ", icon: "UserPlus", color: "#22c55e", sortOrder: 3, villageRestricted: false },
      ];
      const insertedTasks = await db.insert(taskConfigs).values(taskData).returning();

      const cscTask = insertedTasks[0];
      const volTask = insertedTasks[1];
      const supTask = insertedTasks[2];

      if (cscTask) {
        const cscFields = [
          { taskConfigId: cscTask.id, formType: "task", label: "Village", fieldKey: "village", fieldType: "dropdown", isRequired: true, sortOrder: 1 },
          { taskConfigId: cscTask.id, formType: "task", label: "CSC/Camp", fieldKey: "csc_camp", fieldType: "dropdown", isRequired: true, sortOrder: 2 },
          { taskConfigId: cscTask.id, formType: "task", label: "Status", fieldKey: "status", fieldType: "radio", isRequired: true, sortOrder: 3 },
        ];
        const insertedCscFields = await db.insert(formFields).values(cscFields).returning();
        const statusField = insertedCscFields[2];
        if (statusField) {
          await db.insert(fieldOptions).values([
            { formFieldId: statusField.id, label: "Working", value: "working", sortOrder: 1 },
            { formFieldId: statusField.id, label: "Closed", value: "closed", sortOrder: 2 },
          ]);
        }
      }

      if (volTask) {
        const volFields = [
          { taskConfigId: volTask.id, formType: "task", label: "Category", fieldKey: "category", fieldType: "radio", isRequired: true, sortOrder: 1 },
          { taskConfigId: volTask.id, formType: "task", label: "Name", fieldKey: "name", fieldType: "text", isRequired: true, sortOrder: 2, placeholder: "Volunteer name" },
          { taskConfigId: volTask.id, formType: "task", label: "Mobile Number", fieldKey: "mobile_number", fieldType: "phone", isRequired: true, sortOrder: 3, placeholder: "10-digit mobile number" },
          { taskConfigId: volTask.id, formType: "task", label: "Aadhaar Photo", fieldKey: "aadhaar_photo", fieldType: "photo", isRequired: false, sortOrder: 4 },
        ];
        const insertedVolFields = await db.insert(formFields).values(volFields).returning();
        const catField = insertedVolFields[0];
        if (catField) {
          await db.insert(fieldOptions).values([
            { formFieldId: catField.id, label: "Active", value: "active", sortOrder: 1 },
            { formFieldId: catField.id, label: "Inactive", value: "inactive", sortOrder: 2 },
            { formFieldId: catField.id, label: "VIP", value: "vip", sortOrder: 3 },
          ]);
        }
      }

      if (supTask) {
        await db.insert(formFields).values([
          { taskConfigId: supTask.id, formType: "task", label: "Name", fieldKey: "name", fieldType: "text", isRequired: true, sortOrder: 1, placeholder: "Supporter name" },
          { taskConfigId: supTask.id, formType: "task", label: "Contact Number", fieldKey: "contact_number", fieldType: "phone", isRequired: true, sortOrder: 2, placeholder: "10-digit mobile number" },
          { taskConfigId: supTask.id, formType: "task", label: "Aadhaar Photo", fieldKey: "aadhaar_photo", fieldType: "photo", isRequired: false, sortOrder: 3 },
          { taskConfigId: supTask.id, formType: "task", label: "Voter Card Photo", fieldKey: "voter_card_photo", fieldType: "photo", isRequired: false, sortOrder: 4 },
        ]);
      }

      console.log("Task configs seeded successfully!");
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

export async function populateVillageTranslations() {
  try {
    const allVillages = await db.select().from(villages);
    const missing = allVillages.filter(v => !v.nameHi || !v.namePa);
    if (missing.length === 0) return;

    const translationMap: Record<string, { hi: string; pa: string }> = {
      "Ajnauda Kalan": { hi: "अजनौदा कलां", pa: "ਅਜਨੌਦਾ ਕਲਾਂ" },
      "Ajnauda Khurd": { hi: "अजनौदा खुर्द", pa: "ਅਜਨੌਦਾ ਖੁਰਦ" },
      "Allowal": { hi: "अल्लोवाल", pa: "ਅੱਲੋਵਾਲ" },
      "Amaampur Urf Kalifewal": { hi: "अमामपुर उर्फ कालीफेवाल", pa: "ਅਮਾਮਪੁਰ ਉਰਫ਼ ਕਾਲੀਫ਼ੇਵਾਲ" },
      "Aman Vihar": { hi: "अमन विहार", pa: "ਅਮਨ ਵਿਹਾਰ" },
      "Babu Singh Colony": { hi: "बाबू सिंह कॉलोनी", pa: "ਬਾਬੂ ਸਿੰਘ ਕਲੋਨੀ" },
      "Bakshiwala urf Kishanpur": { hi: "बख्शीवाला उर्फ किशनपुर", pa: "ਬਖ਼ਸ਼ੀਵਾਲਾ ਉਰਫ਼ ਕਿਸ਼ਨਪੁਰ" },
      "Banur": { hi: "बनूर", pa: "ਬਨੂਰ" },
      "Baran": { hi: "बड़ां", pa: "ਬੜਾਂ" },
      "Bhangala": { hi: "भंगाला", pa: "ਭੰਗਾਲਾ" },
      "Carrier Enclave": { hi: "कैरियर एन्क्लेव", pa: "ਕੈਰੀਅਰ ਐਨਕਲੇਵ" },
      "Chalaila": { hi: "चलैला", pa: "ਚਲੈਲਾ" },
      "Dandrala Kharoud": { hi: "दंद्राला खरौड", pa: "ਦੰਦਰਾਲਾ ਖਰੌਡ" },
      "Dhanauri": { hi: "ढनौरी", pa: "ਢਨੌਰੀ" },
      "Dhangera": { hi: "ढांगेरा", pa: "ਢਾਂਗੇਰਾ" },
      "Dhanora": { hi: "ढनोरा", pa: "ਢਨੋਰਾ" },
      "Diyagarh": { hi: "दियागढ़", pa: "ਦਿਆਗੜ੍ਹ" },
      "Faggan Majra": { hi: "फग्गन मजरा", pa: "ਫੱਗਣ ਮਜਰਾ" },
      "Faridpur": { hi: "फरीदपुर", pa: "ਫ਼ਰੀਦਪੁਰ" },
      "Fatehgarh Sahib": { hi: "फतेहगढ़ साहिब", pa: "ਫ਼ਤਿਹਗੜ੍ਹ ਸਾਹਿਬ" },
      "Ghamrouda": { hi: "घमरौदा", pa: "ਘਮਰੌਦਾ" },
      "Ghanaur": { hi: "घनौर", pa: "ਘਨੌਰ" },
      "Hardaspur": { hi: "हरदासपुर", pa: "ਹਰਦਾਸਪੁਰ" },
      "Hiana Kalan": { hi: "हियाणा कलां", pa: "ਹਿਆਣਾ ਕਲਾਂ" },
      "Hiana Khurd": { hi: "हियाणा खुर्द", pa: "ਹਿਆਣਾ ਖੁਰਦ" },
      "Hirdapur": { hi: "हिरदापुर", pa: "ਹਿਰਦਾਪੁਰ" },
      "Ichhewal": { hi: "इच्छेवाल", pa: "ਇੱਛੇਵਾਲ" },
      "Jassowal": { hi: "जस्सोवाल", pa: "ਜੱਸੋਵਾਲ" },
      "Kaidupur": { hi: "कैदूपुर", pa: "ਕੈਦੂਪੁਰ" },
      "Kalwa": { hi: "कलवा", pa: "ਕਲਵਾ" },
      "Kansuha Kalan": { hi: "कंसूहा कलां", pa: "ਕੰਸੂਹਾ ਕਲਾਂ" },
      "Karamgarh": { hi: "करमगढ़", pa: "ਕਰਮਗੜ੍ਹ" },
      "Kasiana": { hi: "कसियाना", pa: "ਕਸਿਆਣਾ" },
      "Kathmathi": { hi: "कठमाठी", pa: "ਕਠਮਾਠੀ" },
      "Khurd": { hi: "खुर्द", pa: "ਖੁਰਦ" },
      "Kishangarh": { hi: "किशनगढ़", pa: "ਕਿਸ਼ਨਗੜ੍ਹ" },
      "Lachkani": { hi: "लाचकानी", pa: "ਲਾਚਕਾਨੀ" },
      "Laloda": { hi: "ललोदा", pa: "ਲਲੋਦਾ" },
      "Lang": { hi: "लंग", pa: "ਲੰਗ" },
      "Laut": { hi: "लौट", pa: "ਲੌਟ" },
      "Lubana Karmu": { hi: "लुबाना करमू", pa: "ਲੁਬਾਣਾ ਕਰਮੂ" },
      "Lubana Model Town": { hi: "लुबाना मॉडल टाउन", pa: "ਲੁਬਾਣਾ ਮਾਡਲ ਟਾਊਨ" },
      "Lubana Teku": { hi: "लुबाना टेकू", pa: "ਲੁਬਾਣਾ ਟੇਕੂ" },
      "Majri Akalian": { hi: "मज्री अकालियां", pa: "ਮਜਰੀ ਅਕਾਲੀਆਂ" },
      "Mandaur": { hi: "मंदौर", pa: "ਮੰਦੌਰ" },
      "Mirzapur": { hi: "मिर्ज़ापुर", pa: "ਮਿਰਜ਼ਾਪੁਰ" },
      "Nabha": { hi: "नाभा", pa: "ਨਾਭਾ" },
      "Nandpur Kesho": { hi: "नंदपुर केशो", pa: "ਨੰਦਪੁਰ ਕੇਸ਼ੋ" },
      "Nawa Fatehpur": { hi: "नवा फतेहपुर", pa: "ਨਵਾਂ ਫ਼ਤਿਹਪੁਰ" },
      "New Baran": { hi: "नया बड़ां", pa: "ਨਵਾਂ ਬੜਾਂ" },
      "Paidan": { hi: "पैदां", pa: "ਪੈਦਾਂ" },
      "Paidani Khurd": { hi: "पैदांनी खुर्द", pa: "ਪੈਦਾਨੀ ਖੁਰਦ" },
      "Patran": { hi: "पातड़ां", pa: "ਪਾਤੜਾਂ" },
      "Punjabi University": { hi: "पंजाबी यूनिवर्सिटी", pa: "ਪੰਜਾਬੀ ਯੂਨੀਵਰਸਿਟੀ" },
      "Rajpura": { hi: "राजपुरा", pa: "ਰਾਜਪੁਰਾ" },
      "Ramgarh Channa": { hi: "रामगढ़ छन्ना", pa: "ਰਾਮਗੜ੍ਹ ਛੰਨਾ" },
      "Ranjit Nagar": { hi: "रणजीत नगर", pa: "ਰਣਜੀਤ ਨਗਰ" },
      "Rohta": { hi: "रोहटा", pa: "ਰੋਹਟਾ" },
      "Rohti Basta Singh": { hi: "रोहटी बस्ता सिंह", pa: "ਰੋਹਟੀ ਬਸਤਾ ਸਿੰਘ" },
      "Rohti Chhanna": { hi: "रोहटी छन्ना", pa: "ਰੋਹਟੀ ਛੰਨਾ" },
      "Rohti Khaas": { hi: "रोहटी खास", pa: "ਰੋਹਟੀ ਖ਼ਾਸ" },
      "Rohti Mauran": { hi: "रोहटी मौरां", pa: "ਰੋਹਟੀ ਮੌਰਾਂ" },
      "Rohti Pul": { hi: "रोहटी पुल", pa: "ਰੋਹਟੀ ਪੁਲ" },
      "Rongla": { hi: "रोंगला", pa: "ਰੋਂਗਲਾ" },
      "Rorgarh": { hi: "रोड़गढ़", pa: "ਰੋੜਗੜ੍ਹ" },
      "Samana": { hi: "समाना", pa: "ਸਮਾਣਾ" },
      "Seona": { hi: "सेओना", pa: "ਸਿਓਣਾ" },
      "Shamla": { hi: "शामला", pa: "ਸ਼ਾਮਲਾ" },
      "Sidhuwal": { hi: "सिद्धूवाल", pa: "ਸਿੱਧੂਵਾਲ" },
      "Simbro": { hi: "सिम्ब्रो", pa: "ਸਿੰਬਰੋ" },
      "Sirhind": { hi: "सरहिंद", pa: "ਸਰਹਿੰਦ" },
      "Test Village": { hi: "टेस्ट गांव", pa: "ਟੈਸਟ ਪਿੰਡ" },
      "Urban Estate Phase 1": { hi: "अर्बन एस्टेट फेज़ 1", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 1" },
      "Urban Estate Phase 2": { hi: "अर्बन एस्टेट फेज़ 2", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 2" },
      "Urban Estate Phase 3": { hi: "अर्बन एस्टेट फेज़ 3", pa: "ਅਰਬਨ ਅਸਟੇਟ ਫੇਜ਼ 3" },
      "Vikas Nagar": { hi: "विकास नगर", pa: "ਵਿਕਾਸ ਨਗਰ" },
      "Ward No. 10 , Patiala Rural": { hi: "वार्ड नं. 10 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 10 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 11 , Patiala Rural": { hi: "वार्ड नं. 11 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 11 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 12 , Patiala Rural": { hi: "वार्ड नं. 12 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 12 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 13 , Patiala Rural": { hi: "वार्ड नं. 13 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 13 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 14 , Patiala Rural": { hi: "वार्ड नं. 14 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 14 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 16, Patiala Rural": { hi: "वार्ड नं. 16 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 16 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 18 , Patiala Rural": { hi: "वार्ड नं. 18 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 18 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 19 , Patiala Rural": { hi: "वार्ड नं. 19 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 19 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 2 , Patiala Rural": { hi: "वार्ड नं. 2 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 2 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 20 , Patiala Rural": { hi: "वार्ड नं. 20 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 20 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 21 , Patiala Rural": { hi: "वार्ड नं. 21 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 21 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 22 , Patiala Rural": { hi: "वार्ड नं. 22 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 22 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 23 , Patiala Rural": { hi: "वार्ड नं. 23 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 23 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 24 , Patiala Rural": { hi: "वार्ड नं. 24 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 24 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 25 , Patiala Rural": { hi: "वार्ड नं. 25 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 25 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 26 , Patiala Rural": { hi: "वार्ड नं. 26 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 26 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 27 , Patiala Rural": { hi: "वार्ड नं. 27 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 27 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 28 , Patiala Rural": { hi: "वार्ड नं. 28 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 28 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 29 , Patiala Rural": { hi: "वार्ड नं. 29 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 29 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 3 , Patiala Rural": { hi: "वार्ड नं. 3 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 3 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 4 , Patiala Rural": { hi: "वार्ड नं. 4 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 4 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 5 , Patiala Rural": { hi: "वार्ड नं. 5 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 5 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 6 , Patiala Rural": { hi: "वार्ड नं. 6 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 6 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 7 , Patiala Rural": { hi: "वार्ड नं. 7 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 7 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 8 , Patiala Rural": { hi: "वार्ड नं. 8 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 8 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Ward No. 9 , Patiala Rural": { hi: "वार्ड नं. 9 , पटियाला ग्रामीण", pa: "ਵਾਰਡ ਨੰ. 9 , ਪਟਿਆਲਾ ਦਿਹਾਤੀ" },
      "Zirakpur": { hi: "ज़ीरकपुर", pa: "ਜ਼ੀਰਕਪੁਰ" },
    };

    const { eq } = await import("drizzle-orm");
    let updated = 0;
    for (const v of missing) {
      const t = translationMap[v.name];
      if (t) {
        await db.update(villages).set({ nameHi: t.hi, namePa: t.pa }).where(eq(villages.id, v.id));
        updated++;
      }
    }
    if (updated > 0) {
      console.log(`Updated ${updated} village translations`);
    }
  } catch (error) {
    console.error("Error populating village translations:", error);
  }
}
