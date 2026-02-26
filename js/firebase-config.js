// ========== FIREBASE КОНФИГ ==========

const firebaseConfig = {
    apiKey: "AIzaSyC7odxFXWnsj6t5AanGZlLAOb_AYZeakpo",
    authDomain: "guessgame-1b7d1.firebaseapp.com",
    databaseURL: "https://guessgame-1b7d1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "guessgame-1b7d1",
    storageBucket: "guessgame-1b7d1.firebasestorage.app",
    messagingSenderId: "868994641262",
    appId: "1:868994641262:web:ecccc9e40ad6945636257f"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== ССЫЛКА НА APPS SCRIPT ==========
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwjxQDZYNzmJ9SEl09xaphc0KjsIfUf_p2iop9FAHPTyYKRmQErKi9DxUMOO0clHfg/exec';
