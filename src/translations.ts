import { PictureBook } from './types';

export const TRANSLATIONS = {
  en: {
    appTitle: "PictureBook",
    appSubTitle: "Interactive Picture Books & Creative Studio",
    shelfMode: "Library Shelf",
    workbenchMode: "Creator Studio",
    languageLabel: "Language",
    searchPlaceholder: "Search stories, art mediums, or historical heroes...",
    filterAll: "🌈 All",
    filterSculpture: "🏺 Sculpture",
    filterPainting: "🎨 Painting",
    filterCraft: "✂️ Craft",
    filterAnimation: "🎭 Motion",
    prevPage: "Previous",
    nextPage: "Next",
    addCustomBook: "Create Your Own Picture Book!",
    creatorStudio: "Creator Studio Workbench",
    backToLibrary: "Back to Library Shelf",
    publishLive: "Publish Picture Book Live",
    customBookDetails: "Custom Book Details",
    bookTitle: "Book Title",
    bookDescription: "Book Description",
    bookAuthor: "Artist / Author Name",
    bookCoverImage: "Book Cover Image URL",
    accentColor: "Theme Accent Color",
    bookTags: "Tags (comma-separated)",
    saveDraft: "Save Draft Locally",
    addPage: "Add New Page",
    removePage: "Remove Page",
    readingMode: "Reading Mode",
    activePage: "Active Page",
    educationalInsight: "Art Companion Tip",
    narrativeLabel: "Chapter Story",
    speakAloud: "Read Aloud",
    stopSpeaking: "Stop Reading",
    interactiveCanvas: "Interactive Art Canvas",
    referenceView: "Illustration Reference",
    noIllustrationUploaded: "No illustration uploaded for this page",
    artMediumInsight: "Art Medium Insight",
    colorPalette: "Choose Color Palette",
    brushTexture: "Brush Texture",
    dragFeltPieces: "Drag pieces onto Canvas to build your collage!",
    tapToResize: "Tap a placed piece to scale or rotate it!",
    tapAnimals: "Tap elements to trigger bouncy animations and chimes!",
    subscribersTitle: "Classroom Student Subscriptions",
    subscribersDesc: "Track which children are actively playing and exploring each book.",
    subscribeBtn: "Subscribe Student",
    modalSubscribeTitle: "Subscribe Student to Book Companion",
    studentName: "Student Name",
    favoriteArtMedium: "Favorite Art Medium",
    selectAvatar: "Select Buddy Avatar",
    cancel: "Cancel",
    confirmSubscribe: "Subscribe Now!",
    noBooksFound: "No picture books found matching your search.",
    pageIndexLabel: "Page {current} of {total}",
    editingPageLabel: "Editing Page {number}: {title}",
    requiredFieldsWarning: "⚠️ Please fill in all required fields marked with *!",
    fillTitleWarning: "⚠️ Please fill in the Page Subtitle for Page {number}!",
    fillNarrativeWarning: "⚠️ Please fill in the Chapter Story (Narrative) for Page {number}!",
    fillTipWarning: "⚠️ Please fill in the Art Companion Tip for Page {number}!",
    publishedSuccess: "🎉 Success! \"{title}\" was published live and is now available on the library shelf!",
    savedLocally: "⚠️ Saved locally only. Could not publish to database: {error}",
    connectedDb: "📡 Connected to database! Loaded live picture book(s).",
    offlineMode: "📡 Offline mode: loaded default and local picture book library.",
    openArtistWorkbench: "🎨 Open Artist Creator Studio",
    dismiss: "DISMISS",
    searchLabel: "Search stories...",
    creativeWorkshopSetup: "Educator & Artist Setup",
    creativeWorkshopDesc: "Welcome! This app integrates multiple art forms. To design, write, and publish your own digital stories, enter the Artist workbench.",
    laterClose: "Later (Close)",
    artMediaLabel: "Art Media:",
    byAuthor: "By {author}",
    customTag: "CUSTOM",
    sculptureTip: "Touch and drag to spin! Scroll to zoom.",
    spotlightLabel: "Spotlight Glow:",
    lensFilterLabel: "Lens Filter Effect:",
    revealHidden: "Reveal Hidden Art!",
    drawingOutlineTitle: "Watercolor Canvas Paint",
    selectBrushType: "Select Brush Texture Type:",
    bookmarkPage: "Bookmark Page 🔖",
    pageBookmarked: "Page Bookmarked! 🔖",
    bookmarkRemoved: "Bookmark Removed! 🗑️",
    resumeReading: "Resume Progress 📖",
    bookmarksHeader: "Your Saved Bookmarks 🔖",
    noBookmarks: "You haven't saved any page bookmarks yet. Tap the bookmark icon while reading!",
    pageProgress: "Page {page}",
    removeBookmark: "Remove Bookmark",
    userProfileTitle: "Reader Profile & Settings",
    profileName: "Your Name",
    profileEmail: "Your Email Address",
    profileAvatar: "Choose Reader Buddy Avatar",
    saveProfile: "Save Profile & Settings",
    profileUpdated: "Profile updated successfully! 🎉",
    editProfile: "Edit Reader Profile",
    soundSettings: "Sound Feedback (Bouncy Chimes)",
    enabled: "On",
    disabled: "Off",
    themeSettings: "Reading Light (Theme Mode)",
    dayMode: "Day Mode ☀️",
    nightMode: "Night Mode 🌙"
  },
  sw: {
    appTitle: "PictureBook",
    appSubTitle: "Vitabu vya Picha Maingiliano na Studio ya Ubunifu",
    shelfMode: "Rafu ya Maktaba",
    workbenchMode: "Studio ya Msanii",
    languageLabel: "Lugha",
    searchPlaceholder: "Tafuta hadithi, sanaa, au mashujaa wa kihistoria...",
    filterAll: "🌈 Zote",
    filterSculpture: "🏺 Sanamu",
    filterPainting: "🎨 Kupaka Rangi",
    filterCraft: "✂️ Kolaji",
    filterAnimation: "🎭 Motion",
    prevPage: "Ukurasa Uliopita",
    nextPage: "Ukurasa Ujao",
    addCustomBook: "Tengeneza Kitabu Chako cha Picha!",
    creatorStudio: "Meza ya Kazi ya Studio ya Ubunifu",
    backToLibrary: "Rudi kwenye Maktaba",
    publishLive: "Chapisha Kitabu Live",
    customBookDetails: "Maelezo ya Kitabu Chako",
    bookTitle: "Kichwa la Kitabu",
    bookDescription: "Maelezo ya Kitabu",
    bookAuthor: "Jina la Msanii / Mwandishi",
    bookCoverImage: "URL ya Picha ya Jalada",
    accentColor: "Rangi Kuu ya Mandhari",
    bookTags: "Lebo (tenganisha kwa koma)",
    saveDraft: "Hifadhi Rasimu ya Ndani",
    addPage: "Ongeza Ukurasa Mpya",
    removePage: "Ondoa Ukurasa",
    readingMode: "Njia ya Kusoma",
    activePage: "Ukurasa Amilifu",
    educationalInsight: "Ushauri wa Mwenza wa Sanaa",
    narrativeLabel: "Hadithi ya Sura",
    speakAloud: "Soma kwa Sauti",
    stopSpeaking: "Acha Kusoma",
    interactiveCanvas: "Turubai ya Sanaa Inayoingiliana",
    referenceView: "Rejeleo la Mchoro",
    noIllustrationUploaded: "Hakuna mchoro uliopakiwa kwa ukurasa huu",
    artMediumInsight: "Maarifa ya Aina ya Sanaa",
    colorPalette: "Chagua Rangi",
    brushTexture: "Unyumbufu wa Brashi",
    dragFeltPieces: "Buruta vipande kwenye Turubai ili kujenga kolaji yako!",
    tapToResize: "Gusa kipande kilichowekwa ili kubadilisha ukubwa au kuzungusha!",
    tapAnimals: "Gusa vipengele ili kuanzisha michoro ya kuruka na kengele!",
    subscribersTitle: "Usajili wa Wanafunzi Darasani",
    subscribersDesc: "Fuatilia ni watoto gani wanaocheza kikamilifu na kuchunguza kila kitabu.",
    subscribeBtn: "Sajili Mwanafunzi",
    modalSubscribeTitle: "Sajili Mwanafunzi kwa Mwenza wa Kitabu",
    studentName: "Jina la Mwanafunzi",
    favoriteArtMedium: "Sanaa Anayoipenda Zaidi",
    selectAvatar: "Chagua Avatar ya Rafiki",
    cancel: "Ghairi",
    confirmSubscribe: "Sajili Sasa!",
    noBooksFound: "Hakuna vitabu vya picha vilivyopatikana vinavyolingana na utafutaji wako.",
    pageIndexLabel: "Ukurasa {current} kati ya {total}",
    editingPageLabel: "Kuhariri Ukurasa {number}: {title}",
    requiredFieldsWarning: "⚠️ Tafadhali jaza sehemu zote zinazohitajika zilizowekwa alama ya *!",
    fillTitleWarning: "⚠️ Tafadhali jaza Kichwa cha Sura cha Ukurasa wa {number}!",
    fillNarrativeWarning: "⚠️ Tafadhali jaza Hadithi ya Ukurasa wa {number}!",
    fillTipWarning: "⚠️ Tafadhali jaza Ushauri wa Mwenza wa Sanaa wa Ukurasa wa {number}!",
    publishedSuccess: "🎉 Umefanikiwa! \"{title}\" imechapishwa live na sasa inapatikana kwenye rafu ya maktaba!",
    savedLocally: "⚠️ Imehifadhiwa ndani pekee. Haikuweza kuchapishwa kwenye hifadhidata: {error}",
    connectedDb: "📡 Imeunganishwa na hifadhidata! Imepakia vitabu live vya picha.",
    offlineMode: "📡 Njia ya nje ya mtandao: imepakia maktaba chaguomsingi ya vitabu vya picha.",
    openArtistWorkbench: "🎨 Fungua Studio ya Msanii",
    dismiss: "ONDOA",
    searchLabel: "Tafuta hadithi...",
    creativeWorkshopSetup: "Uwekaji wa Mwalimu na Msanii",
    creativeWorkshopDesc: "Karibu! Programu hii inaunganisha aina mbalimbali za sanaa. Ili kubuni, kuandika, na kuchapisha hadithi zako za kidijitali, ingia kwenye meza ya kazi ya Msanii.",
    laterClose: "Baadaye (Funga)",
    artMediaLabel: "Aina za Sanaa:",
    byAuthor: "Na {author}",
    customTag: "MILA",
    sculptureTip: "Gusa na uburute ili kuzungusha! Sogeza ili kukuza.",
    spotlightLabel: "Mwangaza wa Spotlight:",
    lensFilterLabel: "Athari ya Kichujio cha Lenzi:",
    revealHidden: "Siri Iliyofichwa!",
    drawingOutlineTitle: "Rangi ya Turubai ya Rangi za Maji",
    selectBrushType: "Chagua Aina ya Brashi:",
    bookmarkPage: "Weka Alama ya Ukurasa 🔖",
    pageBookmarked: "Ukurasa Umewekewa Alama! 🔖",
    bookmarkRemoved: "Alama ya Ukurasa Imefutwa! 🗑️",
    resumeReading: "Endelea Kusoma 📖",
    bookmarksHeader: "Alama Zako za Kurasa Zilizohifadhiwa 🔖",
    noBookmarks: "Hujahifadhi alama zozote za kurasa bado. Gusa alama ya ukurasa unaposoma!",
    pageProgress: "Ukurasa wa {page}",
    removeBookmark: "Ondoa Alama",
    userProfileTitle: "Wasifu wa Msomaji & Mipangilio",
    profileName: "Jina Lako",
    profileEmail: "Barua Pepe Yako",
    profileAvatar: "Chagua Avatar ya Rafiki wa Msomaji",
    saveProfile: "Hifadhi Wasifu & Mipangilio",
    profileUpdated: "Wasifu umesasishwa kikamilifu! 🎉",
    editProfile: "Hariri Wasifu wa Msomaji",
    soundSettings: "Madoido ya Sauti (Kengele Zenye Kudunda)",
    enabled: "Washa",
    disabled: "Zima",
    themeSettings: "Mwanga wa Kusoma (Hali ya Mandhari)",
    dayMode: "Hali ya Mchana ☀️",
    nightMode: "Hali ya Usiku 🌙"
  }
};

export function getLocalizedBook(book: PictureBook, lang: 'en' | 'sw'): PictureBook {
  if (lang === 'en' || book.isCustom) return book;
  
  // Return the translated version of the preloaded books
  const translations: Record<string, { title: string; description: string; author?: string; pages: Record<string, { title: string; narrative: string; educationBuddyTip: string }> }> = {
    'book-1': {
      title: 'Chungu cha Udongo cha Matamanio',
      description: 'Safari ya sanaa inayochunguza kazi bora za sanamu, uundaji wa udongo, na kolaji za vitambaa vya mikono!',
      author: 'Elena Rostova (Msanii wa Udongo)',
      pages: {
        'book-1-page-1': {
          title: 'Kuzungusha Chungu cha Udongo',
          narrative: 'Ndani kabisa ya karakana ya kijiji, Elena anatumia gurudumu lake la mfinyanzi kufinyanga udongo mlaini. Inazunguka na kuzunguka! Vidole vyake vinapoongoza udongo, unakua mrefu na wa kifahari. "Utamaduni ni kama udongo," Elena anasema. "Kwa uangalifu na muda, tunaufinyanga kuwa hadithi nzuri zinazobeba maadili na matamanio yetu ya baadaye."',
          educationBuddyTip: 'Wasanii huita hii "Sanamu!" Sanamu ni sanaa unayoweza kuiona kutoka pande zote na kuigusa. Gusa na uburute chungu cha udongo kwenye skrini yako ili kukizungusha, kogeza karibu kwa kutumia gurudumu la kipanya chako, na uguse rangi tofauti za glaze!'
        },
        'book-1-page-2': {
          title: 'Bustani ya Vitambaa ya Matamanio',
          narrative: 'Ili kupamba chungu chake, Elena anatengeneza kitambaa cha joto kwa kutumia vipande vya nguo na maua yaliyochaguliwa kwa mkono. Watoto wanakuja kutoka karibu na mbali ili kubandika vifungo vinavyong\'aa na wanyama wa udongo kwenye bustani ya kitambaa. Kila kipande kinaonyesha matumaini au hamu! Wacha tusaidie Elena kumaliza kolaji hii nzuri ya bustani ya kitambaa!',
          educationBuddyTip: 'Hii ni "Kolaji ya Mikono!" Sanaa ya mikono hutumia vifaa vya ulimwengu halisi kama vile sufu, nyuzi na vipande vya karatasi. Buruta na uondoe vifungo vya sufu na sungura wa udongo kutoka kwenye trei hadi kwenye turubai ya bustani, na ubadilishe ukubwa wao ili kutengeneza muundo mzuri!'
        },
        'book-1-page-3': {
          title: 'Vinyago Vinapozungumza',
          narrative: 'Karakana ya ufinyanzi inapowasha tanuri, uchawi hufurika! Sanamu ndogo za udongo hufufuka chini ya mwangaza wa joto. Mtazame Buddy Mbwa-mchezaji—anatikisika, anahema, na kukunja mkia wake wa udongo! "Sanaa sio tu tafakari tulivu," Elena anacheka. "Kwa mawazo kidogo, inaruka, inazungumza, na kucheza!"',
          educationBuddyTip: 'Hii inatumia "Michoro ya Maingiliano!" Wasanii hutumia teknolojia kufanya michoro itembee unapoingiliana nayo. Bonyeza au uguse Buddy, jua, au uyoga ili kuwafanya warudi juu na chini na kuachia nyota zinazong\'aa!'
        }
      }
    },
    'book-2': {
      title: 'Minong\'ono ya Misitu ya Rangi za Maji',
      description: 'Jifunze kuchanganya rangi, brashi za rangi ya maji, na vichungi vya picha kutoka kwa wanyama wa mwitu wa msituni.',
      author: 'Julian Thorne (Mchoraji & Mpiga Picha)',
      pages: {
        'book-2-page-1': {
          title: 'Kuvuta Pumzi kwa Rangi za Maji',
          narrative: 'Julian anakaa kimya kando ya kijito kinachonong\'ona. Anachovya brashi yake kwenye rangi ya kijani ya msitu, akiipunguza kwa maji. Gusa, gusa! Rangi nyororo za zumaridi zinaenea kwenye karatasi, zikichanganyika na rangi ya dhahabu ya jua. "Kupaka rangi ni ngoma ya mwanga, maji, na rangi," Julian anatabasamu. "Inaonyesha jinsi hisia zinavyoweza kuchanganyika kutoka kivuli kimoja hadi kingine."',
          educationBuddyTip: 'Hii inawakilisha "Kupaka Rangi!" Wachoraji hutumia brashi, rangi za majimaji, na karatasi ngumu ili kuunda muundo mzuri. Buruta brashi yako kwenye turubai nyeupe ili kuifuta kwa rangi za maji zinazovutia na kumfunua kulungu aliyejificha!'
        },
        'book-2-page-2': {
          title: 'Kukamata Mwanga wa Msitu',
          narrative: 'Julian anapiga picha ya paa adimu kupitia lenzi yake. Lakini subiri—jinsi gani kamera ilibadilisha mtazamo? Kwa kurekebisha vichungi vya rangi ya lenzi, Julian anawakilisha hisia tofauti. Bluu tulivu inahisi kama asubuhi ya baridi yenye amani, wakati rangi ya machungwa yenye kung\'aa hufanya nyasi ing\'ae kwa uzima!',
          educationBuddyTip: 'Hii inafundisha "Picha za Kidijitali na Muundo!" Upigaji picha ni kupaka rangi kwa mwanga halisi. Jaribu kubofya vitufe tofauti vya chujio cha lenzi chini ya picha ya paa ili kushuhudia jinsi rangi zinavyobadilisha hisia na kuonyesha vivuli!'
        },
        'book-2-page-3': {
          title: 'Kucheza na Majani ya Dhahabu',
          narrative: 'Katika msitu wa Julian, hata majani yaliyoanguka yanajiunga na sherehe ya kisanii! Kugusa majani huyafanya yazunguke kama wacheza densi wadogo, wakifuta vumbi ili kuonyesha mbawakawa waliojificha. Asili ndio turubai kuu!',
          educationBuddyTip: 'Tumia vidole vyako kubofya vitu vilivyo wazi! Inatumia michoro ya maingiliano ili kuanzisha harakati za kufurahisha na noti za muziki.'
        }
      }
    },
    'book-3': {
      title: 'Safari ya Baharini ya Karatasi',
      description: 'Unda samaki wa matumbawe kwa kutumia mikato ya origami, na uchunguze sanamu za nyota wa baharini.',
      author: 'Kenji Saito (Mbunifu wa Origami & 3D)',
      pages: {
        'book-3-page-1': {
          title: 'Kujenga Kolaji ya Matumbawe',
          narrative: 'Kenji anatengeneza mawimbi kwa kutumia kamba laini za bluu na sufu. Kwa mkasi na usahihi, alikata karatasi zenye kung\'aa za machungwa ili kujenga samaki wa dhahabu na matumbawe. "Kolaji ni sayansi ya kubandika siri zinazopishana," Kenji anaeleza. "Matabaka tofauti ya sufu na vifaa vinavyong\'aa hufanya bahari kuu ionekane ya pande tatu!"',
          educationBuddyTip: 'Hii ni "Sanaa ya Karatasi na Kolaji ya Sufu!" Ili kujenga kitanda cha matumbawe cha Kenji, chagua vifaa kama vile magugu ya baharini, samaki wa karatasi ya machungwa na vifungo vinavyong\'aa kutoka kwenye rafu. Buruta kwenye kitanda cha bahari na uguse ili kuongeza ukubwa!'
        },
        'book-3-page-2': {
          title: 'Almasi Inayong\'aa ya Nyota',
          narrative: 'Ndani kabisa ya mfereji wa bahari kuna kazi bora ya Kenji: Almasi ya Nyota, iliyochongwa kutoka kwa fuwele za bahari. Ina mistari mikali ya sura inayokamata miale ya mwanga ya chini ya bahari, ikionyesha cheche za zumaridi na waridi! "Kwa kuchonga mipaka iliyosafishwa, tunakamata na kuondoa mwanga wa jua," Kenji anaelekeza.',
          educationBuddyTip: 'Hii ni "Sanamu ya Fuwele!" Jaribu kuzungusha kito cha bahari ili kuona sura zake. Badilisha rangi ya mwangaza ili kuchunguza jinsi kingo za fuwele zinavyoakisi mwanga tofauti!'
        },
        'book-3-page-3': {
          title: 'Sherehe ya Povu Chini ya Bahari',
          narrative: 'Pop! Pop! Wimbi linapogeuka, viumbe vya karatasi huanza kutikisika! Jeli-samaki ananyosha mikono yake ya sufu, na pomboo anafanya kuruka kwa neema! Wacha tuwaguse ili kutengeneza midundo ya baharini na povu zinazong\'aa!',
          educationBuddyTip: 'Bonyeza viumbe hawa waliotengenezwa kwa mikono! Kuanzisha michoro hukuruhusu kufurahia bawaba nzuri na harakati za ufundi ambazo Kenji alijenga kwenye vinyago vyake vya karatasi.'
        }
      }
    },
    'book-kenya-1': {
      title: 'Shujaa: Hadithi za Kenya',
      description: 'Safiri nyuma kwa wakati ili kuchunguza mashujaa wa hadithi wa Kenya kama Mekatilili, Luanda Magere, na Syokimau kupitia sanaa ya kupendeza.',
      author: 'Wangari Kimani (Msimuliaji & Mchoraji)',
      pages: {
        'book-kenya-1-page-1': {
          title: 'Mekatilili wa Menza',
          narrative: 'Mekatilili, kiongozi jasiri wa kike wa Mijikenda, anasimama kwa kujivunia chini ya jua la pwani. Anacheza ngoma takatifu ya Kifudu ili kuwaleta watu wake pamoja kwa nguvu na umoja. Anapocheza, ujasiri wake unaangaza kama machezo ya jua ya pwani. "Tunapozungumza kwa sauti moja, sauti zetu zinafika mbali," anatangaza.',
          educationBuddyTip: 'Tazama jinsi wasanii wanavyotumia rangi nyekundu na njano ya dhahabu ili kuonyesha uongozi na moto! Wacha tuchunguze toni nzuri za rangi kwa kuchorea turubai yetu wenyewe.'
        },
        'book-kenya-1-page-2': {
          title: 'Luanda Magere: Shujaa wa Jiwe',
          narrative: 'Katika vilima vya kijani kibichi karibu na Ziwa Victoria, shujaa wa kizandiki wa Luo Luanda Magere anasimama mrefu. Inasemekana ngozi yake ilitengenezwa kwa jiwe gumu jeusi, na kumfanya asiweze kudhurika kwa mikuki na mishale! Aliongoza jamii yake kwa ujasiri, hekima na wema. "Nguvu za ndani zina nguvu zaidi kuliko ngao yoyote ya jiwe," anafundisha.',
          educationBuddyTip: 'Huu ni uwakilishi wa udongo wa 3D. Gusa na uburute sanamu ya mawe ili kuizungusha chini ya mwangaza tofauti ili kufahamu umbo lake dhabiti la kijiometri!'
        },
        'book-kenya-1-page-3': {
          title: 'Maono ya Syokimau',
          narrative: 'Juu kwenye nyanda za Kamba, nabii wa kike Syokimau anatazama wakati ujao. Anatabiri kuja kwa nyoka mkubwa wa chuma anayetambaa kwenye nyasi. Maono yake yanasaidia jamii yake kujiandaa kwa mabadiliko huku wakitunza urithi wao karibu. Gusa ngoma zake takatifu na marafiki zake wa wanyama wa porini ili kufufua utabiri wake na sauti za kichawi!',
          educationBuddyTip: 'Hii ni Michoro Inayoingiliana! Bonyeza au uguse Syokimau, ngoma zake, au rafiki yake nyoka ili kuwaona wakiruka na kuzunguka, wakitoa cheche za unabii!'
        }
      }
    },
    'book-kenya-2': {
      title: 'Utamaduni: Jamii 44',
      description: 'Gundua ushanga mzuri, misitu ya asili ya pwani, na urithi wa muziki wa maziwa wa jamii za Kenya.',
      author: 'Amani Mwangi (Mwanahistoria wa Utamaduni)',
      pages: {
        'book-kenya-2-page-1': {
          title: 'Ushanga wa Maasai wa Umoja',
          narrative: 'Katika nyanda za dhahabu za Bonde la Ufa, wanawake wa Maasai wanakusanyika chini ya mti wa mwavuli. Pamoja, wanatengeneza mikufu mizuri ya shanga za kioo inayoitwa "Enkop". Kila shanga inayong\'aa ni ishara: nyekundu kwa ujasiri, bluu kwa anga, na njano kwa jua linalorutubisha. "Kila shanga ni mwanachama wa jamii," wanaimba, "wakishikiliwa pamoja na nyuzi za upendo."',
          educationBuddyTip: 'Hii ni Kolaji ya Sanaa ya Ushanga! Wacha tusaidie kupamba turubai ya ushanga. Buruta na uondoe nyota za rangi za ushanga, ganda la bahari na vifungo kutoka kwenye rafu ili kuunda medali yako ya kitamaduni!'
        },
        'book-kenya-2-page-2': {
          title: 'Kaya za Pwani za Mijikenda',
          narrative: 'Tembea kwa upole kwenye misitu takatifu ya Kaya ya watu wa Mijikenda kando ya pwani yenye jua ya Kenya. Mitende mirefu na majani manene ya kijani kibichi hulinda nguzo nzuri za mbao za ukumbusho zilizochongwa kwa mkono zinazoitwa "Vigango". Mwitu huo umelinda siri za mababu kwa karne nyingi. Tumia vichujio vya picha za kidijitali ili kusoma jinsi vivuli vya msitu na mwanga vya majani vinavyochanganyika!',
          educationBuddyTip: 'Huu ni utafiti wa picha za kidijitali. Gusa vitufe tofauti vya lenzi ya kichujio chini ya picha ya msitu ili kuchunguza jinsi machweo ya joto au vichungi vya penseli ya mkaa vinavyobadilisha hisia za msitu wa siri!'
        },
        'book-kenya-2-page-3': {
          title: 'Midundo ya Ziwa ya Nyatiti',
          narrative: 'Jua linapozama chini ya Ziwa Victoria, mwanamuziki anacheza "Nyatiti"—kinanda kizuri cha nyuzi nane kutoka kwa jamii ya Luo. Anavaa pete za chuma kwenye vidole vyake vya miguu ili kugonga kwenye fremu, akishika mdundo kamili wa mapigo ya moyo. Kugusa vyombo, mawimbi ya ziwa, na ndege huwafanya wacheze kwa muziki mzuri!',
          educationBuddyTip: 'Gusa vitu vilivyo karibu na Ziwa Victoria ili kuwafanya waruke na kucheza sauti nzuri za muziki wa kiasili wa Kenya!'
        }
      }
    },
    'book-kenya-3': {
      title: 'Koitalel Samoei: Ngao ya Nandi',
      description: 'Jifunze kuhusu kiongozi jasiri wa kiroho na kijeshi wa jamii ya Nandi, Koitalel Arap Samoei, aliyelinda vilima vya kijani kibichi.',
      author: 'Kiprotich Arap Chepkong\'a (Mwanahistoria)',
      pages: {
        'book-kenya-3-page-1': {
          title: 'Mkufu wa Shaba Mtakatifu',
          narrative: 'Koitalel Samoei anasimama juu ya kilima cha juu kabisa huko Nandi, akiwa amevaa mkufu wake mzuri wa shaba wa kifalme unaowakilisha uongozi. Macho yake yanaonyesha mashamba ya chai ya kijani kibichi chini. "Sisi ni imara kama vilima hivi," anazungumza na Baraza lake la Wazee chini ya mkuyu mkubwa.',
          educationBuddyTip: 'Wacha tuchore mandhari haya ya kupendeza! Chunguza rangi nyingi za kijani kibichi, kahawia ya udongo, na bluu ya anga ili kupaka milima.'
        },
        'book-kenya-3-page-2': {
          title: 'Fimbo ya Sherehe (Kipisoi)',
          narrative: 'Tazama Kipisoi iliyochongwa vizuri—fimbo ya mbao ya sherehe iliyopitishwa kupitia vizazi vya Nandi Oloibons. Inawakilisha hekima, amani na mwendelezo wa kitamaduni. Gusa na uzungushe sanamu hii ya shaba ya fimbo ili kuona michongo yake tata!',
          educationBuddyTip: 'Huu ni uwakilishi wa mabaki ya sherehe ya 3D. Buruta ili kuzungusha fimbo ya shaba na kusoma maelezo ya mikono kutoka kila upande.'
        },
        'book-kenya-3-page-3': {
          title: 'Ngao ya Milima ya Highland',
          narrative: 'Chini ya anga ya usiku yenye nyota, mashujaa wa Nandi wanainua ngao zao za ngozi za mapambo kwa salamu ya amani. Gusa nyota, moto wa kambi na ngao ili kuzifanya zicheze na kusikia nyimbo za kutuliza za kiasili zikicheza kwenye bonde zima!',
          educationBuddyTip: 'Gusa vitu vilivyo chini ya anga ya usiku yenye nyota! Bonyeza ngao za mashujaa na moto vya kambi ili kuwafanya waruke na nyota zinazong\'aa.'
        }
      }
    },
    'book-kenya-4': {
      title: 'Mwangeka: Jitu la Taita',
      description: 'Chunguza ujasiri wa ajabu wa Mwangeka wa Mwamburi, kiongozi shujaa aliyelinda vilele vyenye ukungu na mapango ya Taita.',
      author: 'Mwamburi Mshila (Msanii wa Taita)',
      pages: {
        'book-kenya-4-page-1': {
          title: 'Mpigaji Upinde wa Taita',
          narrative: 'Akiwa amesimama imara kati ya vilele vyenye ukungu vya Milima ya Taita, Mwangeka anatayarisha upinde wake wa mbao wa hadithi. Anajulikana kwa kasi kubwa na umahiri, alikuwa mlinzi wa kweli wa mabonde. "Tunalinda udongo wa mababu zetu kwa heshima," anaimba kwa wapiga upinde wenzake.',
          educationBuddyTip: 'Wacha tupake rangi hii ya asubuhi ya milima ya juu! Changanya rangi za ukungu za zambarau baridi na rangi za jua za manjano ya jua ili kunasa hisia ya msitu wenye ukungu.'
        },
        'book-kenya-4-page-2': {
          title: 'Mapango Yaliyofichika ya Taita',
          narrative: 'Ndani kabisa ya miteremko ya mawe ya Taita kuna mapango ya kale, takatifu ya fuvu ambapo mababu walikumbukwa. Mapango hayo yamezungukwa na ferns ndefu, nzuri na okidi za mwituni. Tumia vichujio vya picha ili kusoma jinsi mapango ya giza na yenye siri yanavyoakisi mwanga wa mchana!',
          educationBuddyTip: 'Gusa lenzi za kamera hapa chini ili kusoma jinsi vichujio tofauti vya mwanga vinavyoonyesha muundo wa siri wa mapango ya mawe ya kale!'
        },
        'book-kenya-4-page-3': {
          title: 'Ngoma za Milima',
          narrative: 'Ushindi wa Mwangeka unaadhimishwa kwa kupigwa kwa ngoma za kienyeji za Mwazindika. Sauti hiyo inasikika kwenye milima, ikivuta kila mtu pamoja kwa maelewano. Gusa ngoma kubwa, ndege wa angani na filimbi ili kuunda wimbo mzuri!',
          educationBuddyTip: 'Bonyeza ngoma na filimbi ili kucheza sauti za melodia na kufanya ndege kuruka angani!'
        }
      }
    },
    'book-kenya-5': {
      title: 'Wangu wa Makeri: Malkia wa Gikuyu',
      description: 'Gundua hadithi ya kiongozi wa kike wa kizandiki Wangu wa Makeri, aliyetawala kwa kujiamini na kusherehekea ngoma za Gikuyu.',
      author: 'Nyambura Waithera (Mchongaji & Mwandishi)',
      pages: {
        'book-kenya-5-page-1': {
          title: 'Ngoma ya Mashujaa wa Kibata',
          narrative: 'Wangu wa Makeri ameketi kwenye kiti chake cha kifalme, akitazama mashujaa wachangamfu wa Kibata wakiruka juu angani! Mapambo yao ya manyoya meupe ya mbuni yanayumba kwa uzuri kwenye upepo wa mlimani. "Nguvu ya jamii iko katika furaha yake," anatabasamu, akiinua mikono yake.',
          educationBuddyTip: 'Wacha tuchore ngoma hii ya nguvu! Chagua rangi nyekundu, nyeupe safi, na kahawia ya udongo ili kujaza mavazi mazuri ya kiasili ya wachezaji.'
        },
        'book-kenya-5-page-2': {
          title: 'Kiti cha Wazee (Njung\'wa)',
          narrative: 'Tazama kiti cha wazee chenye miguu mitatu kilichochongwa vizuri (Njung\'wa). Kilichochongwa kutoka kwa kipande kimoja cha mbao ngumu takatifu, kinawakilisha uongozi thabiti, wa haki na wenye nguvu. Zungusha sanamu hii ili kuthamini ustadi wa kuchonga mbao laini!',
          educationBuddyTip: 'Huu ni mfano wa kiti cha kifalme cha 3D. Kizungushe ili kuona jinsi wachongaji wa jadi wa Gikuyu walivyounda miguu na kung\'arisha kiti.'
        },
        'book-kenya-5-page-3': {
          title: 'Filimbi ya Amri',
          narrative: 'Kwa filimbi yake ya sherehe ya fedha, Malkia Wangu wa Makeri anaita mkusanyiko vya kijiji pamoja. Papo hapo, watoto na wazee wanaunda mdundo mkubwa wa ushirika. Gusa filimbi, nyumba za vijiji na mazao ya shambani ili kuwashuhudia wakicheza kwa amri yake!',
          educationBuddyTip: 'Bonyeza kwenye filimbi ya Wangu, kiti chake cha kifalme, na watoto ili kuanzisha michoro ya kuruka ya furaha na cheche za kichawi!'
        }
      }
    },
    'book-kenya-6': {
      title: 'Gor Mahia: Kiongozi wa Maajabu',
      description: 'Chunguza maisha ya fumbo ya Chifu Gor Mahia wa Kanyamwa, mganga mashuhuri aliyeweza kuchanganyika na vilima vya Luo.',
      author: 'Otieno Ogalo (Mchoraji wa Luo)',
      pages: {
        'book-kenya-6-page-1': {
          title: 'Kibuyu cha Uponyaji',
          narrative: 'Chini ya mti wa mwavuli ulioenea kando ya Ziwa Victoria, Gor Mahia anatayarisha mitishamba ya kiasili kwenye kibuyu chake cha kichawi kilichofunikwa kwa ngozi. Anaponya watu kutoka mbali na karibu, akiwafundisha kuheshimu mimea ya asili. "Msitu ni hospitali yetu," anatabasamu, "tunza vizuri."',
          educationBuddyTip: 'Wacha tupake rangi mti wa uponyaji! Chagua kijani kibichi cha zumaridi na manjano ya jua ili kujaza mazingira haya ya ziwa yenye utulivu.'
        },
        'book-kenya-6-page-2': {
          title: 'Kofia ya Chifu wa Luo (Kondo)',
          narrative: 'Chunguza kofia hii nzuri ya Kondo—ya kiasili ya chifu iliyopambwa kwa ganda halisi la cowrie na manyoya ya mwituni ya mbuni. Inawakilisha heshima kubwa, ujasiri na uhusiano wa kiroho. Zungusha sanamu hii ya udongo ili kuona maelezo kwa karibu!',
          educationBuddyTip: 'Huu ni mfano wa kofia ya sherehe ya 3D. Kizungushe ili kuona uwekaji maridadi wa ganda la cowrie na manyoya ya ndege yanayoelea.'
        },
        'book-kenya-6-page-3': {
          title: 'Kiini-Macho cha Miujiza',
          narrative: 'Hadithi zinasema Gor Mahia angeweza kujigeuza kuwa paa mzuri, ndege, au hata mti wa mwavuli ili kuchanganyika na mazingira yake! Gusa mganga, egret anayeruka na samaki wa ziwa kuwashuhudia wakigeuka na kuruka kwa mawimbi ya kichawi!',
          educationBuddyTip: 'Bonyeza paa na ndege anayegeuka! Tazama wanapozunguka na kubadilika kwa cheche za kupendeza za nyota.'
        }
      }
    },
    'book-kenya-7': {
      title: 'Moraa Nkaigo: Shujaa wa Kisii',
      description: 'Gundua kiongozi wa kike jasiri wa Kisii aliyevutia jamii yake kwa kilio cha vita na mawe ya ulinzi.',
      author: 'Moraa Kemunto (Mwanahistoria wa Kisii)',
      pages: {
        'book-kenya-7-page-1': {
          title: 'Mkuki wa Moraa wa Vita',
          narrative: 'Akiwa amesimama katikati ya mashamba ya ndizi ya Kisii, Moraa Nkaigo ameshikilia mkuki wake wa shaba juu. Maneno yake ya ujasiri yanasikika kwenye vilima, yakiunganisha koo katika kulinda urithi wao. "Pamoja, sisi ni mlima ambao hauwezi kuhamishwa," anawaambia wakusanyaji wa kijiji.',
          educationBuddyTip: 'Chora mandhari haya ya mlima yenye nguvu! Chagua nyekundu kwa ajili ya nguo za Moraa, kijani kibichi kwa majani ya ndizi, na nyeupe laini kwa mawingu.'
        }
      }
    }
  };

  const trans = translations[book.id];
  if (!trans) return book;

  // Let's translate book fields
  const pagesTrans = book.pages.map(page => {
    const pageTrans = trans.pages[page.id];
    if (!pageTrans) return page;
    return {
      ...page,
      title: pageTrans.title,
      narrative: pageTrans.narrative,
      educationBuddyTip: pageTrans.educationBuddyTip
    };
  });

  return {
    ...book,
    title: trans.title,
    description: trans.description,
    author: trans.author || book.author,
    pages: pagesTrans
  };
}
