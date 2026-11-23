"""Dictionnaires multilingues (derja en lettres arabes et latines, arabe, français, anglais).

À enrichir avec les mots réellement entendus dans vos clips (onglet « Collecte » de la page de démo).
"""
from __future__ import annotations

DAYS = {
    "mon": ["lundi", "monday", "اثنين", "الاثنين", "ثنين", "tnin", "etnin"],
    "tue": ["mardi", "tuesday", "ثلاثاء", "الثلاثاء", "tleth", "thleth"],
    "wed": ["mercredi", "wednesday", "اربعاء", "الاربعاء", "lerb3a"],
    "thu": ["jeudi", "thursday", "خميس", "الخميس", "khmis", "5mis"],
    "fri": ["vendredi", "friday", "جمعة", "الجمعة", "jom3a", "jem3a"],
    "sat": ["samedi", "saturday", "سبت", "السبت", "sebt", "sabt"],
    "sun": ["dimanche", "sunday", "الاحد", "a7ad", "la7ad"],
}
ALL_DAYS = ["tous les jours", "every day", "كل يوم", "كل نهار", "kol nhar", "koll nhar", "kol yom", "kol youm", "koll youm", "kol jour", "toute la semaine",
            "كل الجمعة", "tout le temps", "dima", "ديما", "بكل نهار", "ديسبوني كل نهار", "disponible kol nhar"]
SLOTS = {
    "morning": ["matin", "morning", "صباح", "الصباح", "صباحا", "صباحًا", "في الصباح", "sbe7", "sbah"],
    "afternoon": ["après-midi", "apres-midi", "afternoon", "بعد الظهر", "عشية", "العشية", "3chiya", "aachiya"],
    "evening": ["soir", "evening", "night", "ليل", "الليل", "بالليل", "في الليل", "مساء", "المساء", "مساءا", "fil lil", "bil lil", "soirée"],
}
LANGS = {
    "ar": ["arabe", "arabic", "عربي", "العربية", "derja", "دارجة", "tounsi", "تونسي", "3arbi"],
    "fr": ["français", "francais", "french", "فرنسي", "الفرنسية", "fransi", "fransawi", "فرنساوي", "فرانساوي", "fransaoui", "فرنسية"],
    "en": ["anglais", "english", "انقليزي", "انجليزي", "الانجليزية", "الإنجليزية", "انجليزية", "ngliz", "angliz", "نڨليزي"],
}
SPEAK_VERBS = ["parle", "speak", "أتحدث", "اتحدث", "نتحدث", "يتحدث", "نحكي", "نتكلم", "n7ki", "nahki", "netkallem", "langues", "لغات", "languages"]

PROVIDER_WORDS = ["nekhdem", "n5dem", "nakhdem", "نخدم", "je travaille", "je propose", "je fais", "mon métier", "je donne",
                  "j'enseigne", "i teach", "اعمل", "أعمل", "نعمل", "اشتغل", "نشتغل", "ne5dem", "nekhdem ka",
                  "mon metier", "i work", "i offer", "i provide", "نقدم", "n9addem", "صنعتي", "san3ti", "خدمتي",
                  "je suis", "ena", "انا", "أنا", "i am a", "i'm a"]
CUSTOMER_WORDS = ["n9alleb", "nqalleb", "nkalleb", "نقلب على", "nest7a9", "nestha9", "نستحق", "n7eb", "nheb", "n7ib", "نحب", "nlawej", "nlawwej", "نلوج", "je cherche", "j'ai besoin", "je veux",
                  "i need", "i'm looking", "looking for", "i want", "محتاج", "mehtej", "ابحث", "أبحث", "يلزمني", "ylzemni"]
# « n7eb nekhdem » = « je veux travailler » : le mot « travailler » l'emporte (prestataire).
INTRO_WORDS = ["je m'appelle", "my name is", "moi c'est", "ismi", "esmi", "اسمي", "إسمي", "ana", "ena", "eni", "ani", "انا", "أنا", "آني", "اني", "انايا",
               "je suis", "i am", "i'm", "c'est"]
# Salutations en début de phrase, avant le prénom : « عسلامة، رندا تواتي… », « Bonjour, Randa Touati… ».
GREETINGS = ["aslema", "3aslema", "asslema", "salam", "salem", "salut", "bonjour", "bonsoir", "ahla", "ahlan", "marhba",
             "hello", "hi", "hey", "good morning", "good evening", "عسلامة", "عسلامه", "سلام", "السلام عليكم",
             "سلام عليكم", "أهلا", "اهلا", "مرحبا", "صباح الخير", "مساء الخير", "بونجور"]
LAST_NAME_WORDS = ["nom de famille", "laqabi", "la9abi", "لقبي", "my last name is", "my surname is"]
NOT_A_NAME = {"good", "okay", "ok", "yes", "yeah", "well", "hello", "hi", "thanks", "thank", "nice", "great", "fine", "so",
              "bien", "merci", "voila", "voilà", "alors", "donc", "bon", "oui", "non", "euh", "bah", "ah", "eh", "behi", "ey", "la",
              "chnouwa", "chnoua", "chnowa", "chnou", "شنوة", "شنوا", "شنو", "يعني", "ya3ni", "kifech", "كيفاش", "amma", "ama",
              "haw", "هاو", "tawa", "توة", "taw", "aya", "ايا", "يزي", "yezzi", "mta3", "متاع", "بالطبيعة",
              "al", "el", "ben", "bin", "plombier", "electricien", "électricien", "femme", "fam", "chauffeur", "nekhdem", "n7eb", "nheb", "نخدم",
              "نحب", "من", "في", "fi", "men", "mel", "de", "du", "la", "le", "un", "une", "a", "an", "the", "here",
              "ici", "houni", "هوني", "هنا", "disponible", "available", "متوفر", "nlawej", "نلوج", "je", "i", "très",
              "tres", "content", "contente", "معينة", "m3ina", "prof", "professeur", "teacher", "ahla", "أهلا", "bonjour",
              "salut", "hello", "marhba", "مرحبا", "عسلامة", "aslema", "3aslema", "client", "cliente", "c'est", "cest",
              "me", "moi", "ana", "ena", "انا", "nheb", "مش", "موش", "mouch", "mich", "w", "و", "et", "and", "so", "euh",
              "باهي", "behi", "bahi", "برشا", "barcha", "عمل", "اعمل", "نعمل", "يعمل", "اشتغل", "نشتغل", "khdemt",
              "kifech", "كيفاش", "شنوة", "chnowa", "هاني", "hani", "توا", "tawa", "donne", "fais", "suis", "work"}

NUMBER_WORDS = {
    1: ["wa7ed", "wa7da", "واحد", "واحدة", "un", "une", "one"], 2: ["zouz", "زوز", "جوج", "deux", "two", "اثنين"],
    3: ["thletha", "tlata", "ثلاثة", "ثلاث", "trois", "تروا", "three"], 4: ["arb3a", "arba3", "arba", "أربعة", "اربعة", "أربع", "اربع", "كاتر", "quatre", "four"],
    5: ["khamsa", "5amsa", "خمسة", "خمس", "سانك", "سنك", "cinq", "five"], 6: ["setta", "ستة", "ست", "six"], 7: ["sab3a", "سبعة", "سبع", "sept", "seven"],
    8: ["thmanya", "ثمانية", "ثماني", "ثمان", "huit", "eight"], 9: ["tes3a", "تسعة", "تسع", "neuf", "nine"],
    10: ["3achra", "عشرة", "عشر", "dix", "ten"], 11: ["7dach", "حداش", "احدى عشرة", "احد عشر", "onze", "eleven"], 12: ["thnach", "اثناش", "اثنتي عشرة", "اثني عشر", "اثنا عشر", "douze", "twelve"],
    13: ["tletach", "ثلطاش", "ثلاث عشرة", "treize", "thirteen"], 14: ["arba3tach", "اربعطاش", "اربع عشرة", "quatorze", "fourteen"],
    15: ["khmestach", "خمسطاش", "quinze", "fifteen"], 20: ["3echrin", "عشرين", "عشرون", "vingt", "twenty"], 30: ["tlethin", "ثلاثين", "ثلاثون", "trente", "thirty"],
    40: ["arb3in", "اربعين", "أربعين", "quarante", "forty"], 50: ["khamsin", "5amsin", "خمسين", "خمسون", "cinquante", "fifty"],
    60: ["settin", "ستين", "soixante", "sixty"], 70: ["sab3in", "سبعين", "soixante-dix", "seventy"],
    80: ["thmanin", "ثمانين", "quatre-vingts", "eighty"], 100: ["mya", "miya", "مية", "مائة", "مئة", "cent", "hundred", "one hundred"],
    25: ["khamsa w 3echrin", "خمسة وعشرين", "vingt-cinq", "vingt cinq", "twenty-five", "twenty five"],
    30: ["thlethin", "ثلاثين", "trente", "thirty"],
}
AGE_WORDS = ["عمري", "عمرو", "عمره", "3omri", "omri", "âge", "age", "سني", "sinni", "old"]
EXPERIENCE_WORDS = ["خبرة", "خبره", "اكسبريونس", "إكسبريونس", "ديسبيرينس", "دكسبيرينس", "اكسبيرينس", "إكسبيرينس", "دكسبريونس", "experience", "expérience", "khebra", "5ebra", "تجربة"]
YEAR_WORDS = ["ans", "an", "années", "years", "year", "sna", "snin", "snine", "سنين", "سنة", "سنوات", "عام", "أعوام", "اعوام"]
MONEY_WORDS = ["dinars", "dinar", "dt", "tnd", "د.ت", "دينار", "دنانير", "دينارات", "دينارا", "مليون", "alf"]

# Prénoms tunisiens courants : latin ↔ arabe (pour écrire le prénom dans l'écriture de la page).
NAMES = {
    "Taher": "طاهر", "Attia": "عطية", "Ammar": "عمار", "Bechir": "بشير", "Mokhtar": "مختار", "Hedia": "هادية",
    "Chourouk": "شروق", "Chaker": "شاكر", "Mohamed": "محمد", "Ahmed": "أحمد", "Mahmoud": "محمود", "Mustapha": "مصطفى",
    # Prénoms tunisiens courants (5 nov.) : pour l'écrire dans la bonne écriture quand on change de langue
    "Yassine": "ياسين", "Amine": "أمين", "Sonia": "سنية", "Rim": "ريم", "Nabil": "نبيل", "Olfa": "ألفة", "Asma": "أسماء",
    "Sarra": "سارة", "Wafa": "وفاء", "Houssem": "حسام", "Hamza": "حمزة", "Oussama": "أسامة", "Skander": "إسكندر",
    "Achraf": "أشرف", "Wael": "وائل", "Seif": "سيف", "Marwen": "مروان", "Nizar": "نزار", "Riadh": "رياض", "Slim": "سليم",
    "Tarek": "طارق", "Zied": "زياد", "Chokri": "شكري", "Lotfi": "لطفي", "Mourad": "مراد", "Ridha": "رضا", "Samir": "سمير",
    "Hedi": "الهادي", "Brahim": "إبراهيم", "Ali": "علي", "Hassen": "حسن", "Hussein": "حسين", "Ahlem": "أحلام",
    "Amira": "أميرة", "Imen": "إيمان", "Ines": "إيناس", "Khaoula": "خولة", "Manel": "منال", "Meriem": "مريم",
    "Nesrine": "نسرين", "Rahma": "رحمة", "Safa": "صفاء", "Salwa": "سلوى", "Samia": "سامية", "Sana": "سناء",
    "Souad": "سعاد", "Wiem": "وئام", "Yosra": "يسرى", "Zeineb": "زينب", "Fatma": "فاطمة", "Aicha": "عائشة",
    "Khadija": "خديجة", "Hajer": "هاجر", "Hanen": "حنان", "Jihen": "جيهان", "Latifa": "لطيفة", "Mabrouka": "مبروكة",
    "Najet": "نجاة", "Saida": "سعيدة", "Emna": "آمنة", "Ons": "أنس", "Malek": "مالك", "Aziz": "عزيز", "Firas": "فراس",
    "Ghassen": "غسان", "Hatem": "حاتم", "Jamel": "جمال", "Kais": "قيس", "Majdi": "مجدي", "Mondher": "منذر",
    "Nejib": "نجيب", "Omar": "عمر", "Rached": "راشد", "Sofiene": "سفيان", "Wassim": "وسيم", "Youssef": "يوسف",
    "Salah": "صالح", "Gharbi": "الغربي", "Trabelsi": "الطرابلسي",
    # Noms de famille tunisiens courants (pour passer d'une écriture à l'autre quand on change de langue)
    "Hammami": "الحمامي", "Jaziri": "الجزيري", "Mansour": "منصور", "Chaabane": "شعبان", "Ayari": "العياري",
    "Mejri": "الماجري", "Jebali": "الجبالي", "Khemiri": "الخميري", "Saidi": "السعيدي", "Dridi": "الدريدي",
    "Zouari": "الزواري", "Sassi": "الساسي", "Riahi": "الرياحي", "Ferchichi": "الفرشيشي", "Hamdi": "حمدي",
    "Mansouri": "المنصوري", "Bouazizi": "البوعزيزي", "Tlili": "التليلي", "Jlassi": "الجلاصي", "Mbarki": "المباركي",
    "Hajji": "الحاجي", "Guesmi": "القاسمي", "Nasri": "النصري", "Sghaier": "الصغير", "Rekaya": "الرقيعة",
    "Bennour": "بن نور", "Chebbi": "الشابي", "Karoui": "القروي", "Masmoudi": "المصمودي", "Bouzid": "بوزيد",
    "Salma": "سلمى", "Karim": "كريم", "Mehdi": "مهدي", "Amel": "أمل", "Sami": "سامي", "Ines": "إيناس", "Hela": "هالة",
    "Walid": "وليد", "Rania": "رانية", "Randa": "رندا", "Touati": "التواتي", "Anis": "أنيس", "Mouna": "منى", "Fathi": "فتحي", "Nadia": "نادية",
    "Hichem": "هشام", "Leila": "ليلى", "Bilel": "بلال", "Mohamed": "محمد", "Ahmed": "أحمد", "Ali": "علي",
    "Youssef": "يوسف", "Omar": "عمر", "Khalil": "خليل", "Hamza": "حمزة", "Aymen": "أيمن", "Mariem": "مريم",
    "Fatma": "فاطمة", "Asma": "أسماء", "Sarra": "سارة", "Rim": "ريم", "Emna": "آمنة", "Yasmine": "ياسمين",
    "Nour": "نور", "Houda": "هدى", "Sonia": "سنية", "Samia": "سامية", "Hajer": "هاجر", "Sana": "سناء", "Wafa": "وفاء",
    "Imen": "إيمان", "Oussama": "أسامة", "Skander": "إسكندر", "Wassim": "وسيم", "Firas": "فراس", "Slim": "سليم",
    "Riadh": "رياض", "Nizar": "نزار", "Maher": "ماهر", "Hatem": "حاتم", "Chokri": "شكري", "Lotfi": "لطفي",
    "Moncef": "منصف", "Habib": "حبيب", "Taoufik": "توفيق", "Mounir": "منير", "Kamel": "كمال",
    "Khadija": "خديجة", "Aicha": "عائشة", "Zeineb": "زينب", "Olfa": "ألفة", "Najet": "نجاة", "Raja": "رجاء",
}

DAY_LABEL = {
    "fr": {"mon": "lundi", "tue": "mardi", "wed": "mercredi", "thu": "jeudi", "fri": "vendredi", "sat": "samedi", "sun": "dimanche"},
    "ar": {"mon": "الاثنين", "tue": "الثلاثاء", "wed": "الأربعاء", "thu": "الخميس", "fri": "الجمعة", "sat": "السبت", "sun": "الأحد"},
    "en": {"mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday", "fri": "Friday", "sat": "Saturday", "sun": "Sunday"},
}
SLOT_LABEL = {"fr": {"morning": "matin", "afternoon": "après-midi", "evening": "soir"},
              "ar": {"morning": "صباحًا", "afternoon": "بعد الظهر", "evening": "مساءً"},
              "en": {"morning": "morning", "afternoon": "afternoon", "evening": "evening"}}
LANG_LABEL = {"fr": {"ar": "arabe", "fr": "français", "en": "anglais"},
              "ar": {"ar": "العربية", "fr": "الفرنسية", "en": "الإنجليزية"},
              "en": {"ar": "Arabic", "fr": "French", "en": "English"}}

# v1.3.5 (11 nov.) : prénoms et noms tunisiens courants en plus, pour que le changement de langue (sans IA)
# connaisse la bonne orthographe (« باسم » → « Bassem » et pas « Besem »).
NAMES.update({
    "Bassem": "باسم", "Bassam": "بسام", "Hassan": "حسن", "Hosni": "حسني", "Adel": "عادل", "Adnen": "عدنان",
    "Akram": "أكرم", "Anouar": "أنور", "Aroua": "أروى", "Asma": "أسماء", "Atef": "عاطف", "Ayoub": "أيوب",
    "Bochra": "بشرى", "Chadia": "شادية", "Chaima": "شيماء", "Dorra": "درة", "Faouzi": "فوزي", "Farah": "فرح",
    "Faten": "فاتن", "Fedi": "فادي", "Feriel": "فريال", "Ferid": "فريد", "Ghada": "غادة", "Hayfa": "هيفاء",
    "Hamdi": "حمدي", "Haythem": "هيثم", "Ibtissem": "ابتسام", "Ichraf": "إشراف", "Iheb": "إيهاب", "Ilyes": "إلياس",
    "Insaf": "إنصاف", "Jalel": "جلال", "Jawher": "جوهر", "Kawther": "كوثر", "Lamia": "لمياء", "Lina": "لينة",
    "Lobna": "لبنى", "Mahdi": "مهدي", "Malika": "مليكة", "Marwa": "مروى", "Mehrez": "محرز", "Mohsen": "محسن",
    "Mongi": "منجي", "Monia": "منية", "Nadhem": "ناظم", "Naima": "نعيمة", "Najla": "نجلاء", "Nawel": "نوال",
    "Nejla": "نجلة", "Noura": "نورة", "Raoudha": "روضة", "Rafik": "رفيق", "Ramzi": "رمزي", "Rihab": "رحاب",
    "Sabri": "صبري", "Sabrine": "صابرين", "Sahar": "سحر", "Salem": "سالم", "Selim": "سليم", "Sihem": "سهام",
    "Sirine": "سيرين", "Soumaya": "سمية", "Syrine": "سيرين", "Tahani": "تهاني", "Wided": "وداد", "Yahia": "يحيى",
    "Yousra": "يسرى", "Zahra": "زهرة", "Zohra": "زهرة", "Zeyneb": "زينب",
    "Abidi": "العبيدي", "Arfaoui": "العرفاوي", "Ayadi": "العيادي", "Baccouche": "بكوش", "Belhaj": "بالحاج",
    "Ben Ammar": "بن عمار", "Ben Salah": "بن صالح", "Boughanmi": "البوغانمي", "Bouslama": "بوسلامة",
    "Chaouachi": "الشواشي", "Dhaouadi": "الضاوي", "Fourati": "الفوراتي", "Ghanmi": "الغانمي", "Hamdani": "الحمداني",
    "Haddad": "الحداد", "Hammouda": "حمودة", "Jemli": "الجملي", "Kchaou": "كشاو", "Khelifi": "الخليفي",
    "Labidi": "العبيدي", "Maalej": "المعالج", "Mahjoub": "المحجوب", "Mathlouthi": "المثلوثي", "Mestiri": "المستيري",
    "Methni": "المثني", "Nouri": "النوري", "Oueslati": "الوسلاتي", "Rezgui": "الرزقي", "Sahli": "الساحلي",
    "Selmi": "السالمي", "Sellami": "السلامي", "Slimani": "السليماني", "Smaoui": "السماوي", "Souissi": "السويسي",
    "Zaouali": "الزواوي", "Zribi": "الزريبي", "Rgaya": "الرقاية",
})

# v2.1 (réunion du 13 nov.) : plus de prénoms et noms tunisiens → moins de « à vérifier » quand on change de langue.
NAMES.update({
    "Abdallah": "عبد الله", "Abdelaziz": "عبد العزيز", "Abdelkader": "عبد القادر", "Abdelkarim": "عبد الكريم", "Abdelmajid": "عبد المجيد", "Abderrahmen": "عبد الرحمان",
    "Abderrazak": "عبد الرزاق", "Abdessalem": "عبد السلام", "Abir": "عبير", "Adam": "آدم", "Afef": "عفاف", "Alaa": "علاء",
    "Amani": "أماني", "Ameni": "أماني", "Anas": "أنس", "Arij": "أريج", "Eya": "آية",
    "Azza": "عزة", "Balkis": "بلقيس", "Basma": "بسمة", "Besma": "بسمة", "Bayrem": "بيرم", "Boubaker": "بوبكر",
    "Chahd": "شهد", "Chams": "شمس", "Chiraz": "شيراز", "Dalila": "دليلة", "Donia": "دنيا", "Fadhel": "فاضل",
    "Fadwa": "فدوى", "Fares": "فارس", "Fathia": "فتحية", "Fawzia": "فوزية", "Faycal": "فيصل", "Ferdaous": "فردوس",
    "Foued": "فؤاد", "Ghazi": "غازي", "Hafedh": "حافظ", "Hakim": "حكيم", "Halima": "حليمة", "Hamadi": "حمادي",
    "Hana": "هناء", "Hasna": "حسناء", "Haykel": "هيكل", "Hiba": "هبة", "Ibrahim": "إبراهيم", "Ikram": "إكرام",
    "Ilhem": "إلهام", "Islem": "إسلام", "Jamila": "جميلة", "Jalila": "جليلة", "Jihed": "جهاد", "Kalthoum": "كلثوم",
    "Karima": "كريمة", "Khaled": "خالد", "Khalifa": "خليفة", "Lassaad": "لسعد", "Lilia": "ليليا", "Linda": "ليندة",
    "Maha": "مها", "Mahassen": "محاسن", "Maissa": "ميساء", "Manar": "منار", "Maram": "مرام", "Marouen": "مروان",
    "Maroua": "مروى", "Mejda": "ماجدة", "Montassar": "منتصر", "Moez": "معز", "Mootez": "معتز", "Mounira": "منيرة",
    "Nada": "ندى", "Nadhir": "نذير", "Nadine": "نادين", "Naoufel": "نوفل", "Nawres": "نورس", "Nazih": "نزيه",
    "Neila": "نائلة", "Nidhal": "نضال", "Noureddine": "نور الدين", "Nourhene": "نورهان", "Oumayma": "أميمة", "Radhia": "راضية",
    "Rabeb": "رباب", "Rami": "رامي", "Rawia": "راوية", "Raouf": "رؤوف", "Rayen": "ريان", "Saber": "صابر",
    "Sadok": "صادق", "Safia": "صفية", "Samar": "سمر", "Samira": "سميرة", "Saoussen": "سوسن", "Sawsen": "سوسن",
    "Selma": "سلمى", "Selima": "سليمة", "Slah": "صلاح", "Sofien": "سفيان", "Soufiene": "سفيان", "Sondes": "سندس",
    "Souha": "سهى", "Tasnim": "تسنيم", "Thouraya": "ثريا", "Wajdi": "وجدي", "Wala": "ولاء", "Wejden": "وجدان",
    "Wissem": "وسام", "Yesmine": "ياسمين", "Younes": "يونس", "Zakaria": "زكرياء", "Zouhour": "زهور", "Hamida": "حميدة",
    "Habiba": "حبيبة", "Ramla": "رملة", "Rafika": "رفيقة", "Nermine": "نرمين", "Nihel": "نهال", "Malak": "ملاك",
    "Ranim": "رنيم", "Yomna": "يمنى", "Mabrouk": "مبروك", "Belgacem": "بلقاسم", "Ezzeddine": "عز الدين", "Faiza": "فائزة",
    "Hayet": "حياة", "Zina": "زينة", "Abdelli": "العبدلي", "Amri": "العامري", "Aouadi": "العوادي", "Ben Ali": "بن علي",
    "Ben Amor": "بن عمر", "Ben Hassen": "بن حسن", "Ben Mabrouk": "بن مبروك", "Ben Romdhane": "بن رمضان", "Ben Said": "بن سعيد", "Ben Youssef": "بن يوسف",
    "Ben Othman": "بن عثمان", "Ben Mansour": "بن منصور", "Ben Abdallah": "بن عبد الله", "Ben Khalifa": "بن خليفة", "Ben Ahmed": "بن أحمد", "Ben Hamida": "بن حميدة",
    "Ben Jemaa": "بن جمعة", "Bouaziz": "بوعزيز", "Bouhlel": "بوهلال", "Bouraoui": "البوراوي", "Chakroun": "شكرون", "Charfi": "الشرفي",
    "Chtioui": "الشتيوي", "Dhahri": "الظاهري", "Elleuch": "اللوش", "Gabsi": "القابسي", "Gafsi": "القفصي", "Ghorbel": "غربال",
    "Hamrouni": "الحمروني", "Hannachi": "الحناشي", "Jaballah": "جاب الله", "Jendoubi": "الجندوبي", "Kammoun": "كمون", "Karray": "كراي",
    "Khiari": "الخياري", "Ksouri": "القصوري", "Louati": "اللواتي", "Maaloul": "معلول", "Marzouki": "المرزوقي", "Messaoudi": "المسعودي",
    "Mrad": "مراد", "Nafti": "النفطي", "Ouni": "العوني", "Rahali": "الرحالي", "Romdhani": "الرمضاني", "Saafi": "الصافي",
    "Sfaxi": "الصفاقسي", "Slama": "سلامة", "Tounsi": "التونسي", "Turki": "التركي", "Yahyaoui": "اليحياوي", "Zaghouani": "الزغواني",
    "Zitouni": "الزيتوني", "Zouaoui": "الزواوي", "Bouhajeb": "بوحاجب", "Jridi": "الجريدي", "Khadraoui": "الخضراوي", "Kefi": "الكافي",
    "Mokni": "المكني", "Najjar": "النجار", "Neji": "الناجي", "Rebai": "الرباعي", "Ferjani": "الفرجاني", "Jouini": "الجويني",
    "Nasraoui": "النصراوي", "Cherif": "الشريف",
    "Romdhane": "رمضان", "Said": "سعيد", "Othman": "عثمان", "Jemaa": "جمعة", "Amor": "عمر",
})
