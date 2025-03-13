/**
 * L'aube sanglante - Encyclopédie
 * Script principal de l'application
 */

// État de l'application
const appState = {
    currentView: 'welcome',
    currentCategory: null,
    searchResults: [],
    dataCache: null
};

// Éléments DOM
const elements = {
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    categories: document.querySelectorAll('.category'),
    welcomeScreen: document.getElementById('welcome-screen'),
    chatContainer: document.getElementById('chat-container'),
    resultsContainer: document.getElementById('results-container'),
    chatInput: document.getElementById('chat-input'),
    chatSend: document.getElementById('chat-send'),
    chatMessages: document.getElementById('chat-messages'),
    examples: document.querySelectorAll('.example')
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Fonction d'initialisation
function initApp() {
    // Charger les métadonnées
    loadMetadata()
        .then(data => {
            appState.dataCache = data;
            console.log('Métadonnées chargées avec succès');
        })
        .catch(error => {
            console.error('Erreur lors du chargement des métadonnées:', error);
        });
    
    // Initialiser les événements
    initEvents();
    
    // Initialiser le moteur de recherche
    initSearchEngine();
    
    // Initialiser le chatbot
    initChatbot();
}

// Chargement des métadonnées
async function loadMetadata() {
    try {
        const response = await fetch('data/metadata.json');
        if (!response.ok) {
            throw new Error('Impossible de charger les métadonnées');
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur lors du chargement des métadonnées:', error);
        return {
            characters: [],
            locations: [],
            deities: [],
            skills: []
        };
    }
}

// Initialisation des événements
function initEvents() {
    // Événement de recherche
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Événements des catégories
    elements.categories.forEach(category => {
        category.addEventListener('click', () => {
            const categoryType = category.dataset.category;
            showCategory(categoryType);
        });
    });
    
    // Événements des exemples de questions
    elements.examples.forEach(example => {
        example.addEventListener('click', () => {
            const query = example.dataset.query;
            elements.searchInput.value = query;
            switchToChat();
            processChatMessage(query);
        });
    });
    
    // Événements du chat
    elements.chatSend.addEventListener('click', handleChatSend);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatSend();
        }
    });
}

// Gestion de la recherche
function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (query.length < 2) {
        alert('Veuillez entrer au moins 2 caractères pour la recherche.');
        return;
    }
    
    // Déterminer si c'est une question ou une recherche simple
    if (isQuestion(query)) {
        switchToChat();
        processChatMessage(query);
    } else {
        performSearch(query);
    }
}

// Vérifier si la requête est une question
function isQuestion(query) {
    // Détecte si la requête ressemble à une question
    const questionPatterns = [
        /^qui/i, /^que/i, /^quoi/i, /^comment/i, /^pourquoi/i, /^où/i, /^quand/i,
        /^quel/i, /^quelle/i, /^quels/i, /^quelles/i, /^raconte/i, /^parle/i,
        /^dis/i, /\?$/
    ];
    
    return questionPatterns.some(pattern => pattern.test(query));
}

// Afficher une catégorie
function showCategory(categoryType) {
    appState.currentCategory = categoryType;
    appState.currentView = 'results';
    
    // Afficher les résultats de la catégorie
    showView('results');
    
    // Récupérer et afficher les éléments de la catégorie
    fetchCategoryItems(categoryType)
        .then(items => {
            displayCategoryItems(items, categoryType);
        })
        .catch(error => {
            console.error(`Erreur lors du chargement de la catégorie ${categoryType}:`, error);
            elements.resultsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Erreur de chargement</h3>
                    <p>Impossible de charger les données de la catégorie ${categoryType}.</p>
                </div>
            `;
        });
}

// Récupérer les éléments d'une catégorie
async function fetchCategoryItems(categoryType) {
    // Utiliser le cache si disponible
    if (appState.dataCache && appState.dataCache[categoryType]) {
        return appState.dataCache[categoryType];
    }
    
    // Sinon, charger depuis les fichiers
    try {
        const response = await fetch(`data/${categoryType}.json`);
        if (!response.ok) {
            throw new Error(`Impossible de charger ${categoryType}.json`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erreur lors du chargement de ${categoryType}.json:`, error);
        // Retourner un tableau vide en cas d'erreur
        return [];
    }
}

// Afficher les éléments d'une catégorie
function displayCategoryItems(items, categoryType) {
    const categoryTitles = {
        'characters': 'Personnages',
        'locations': 'Lieux',
        'deities': 'Dieux',
        'skills': 'Compétences'
    };
    
    let html = `<h2>${categoryTitles[categoryType] || categoryType}</h2>`;
    
    if (items.length === 0) {
        html += '<p>Aucun élément trouvé dans cette catégorie.</p>';
    } else {
        html += '<div class="category-items">';
        
        items.forEach(item => {
            html += `
                <div class="result-item" data-id="${item.id}">
                    <h3 class="result-title">${item.name}</h3>
                    <p>${item.description || 'Cliquez pour voir les détails'}</p>
                    <button class="view-details" data-id="${item.id}" data-type="${categoryType}">
                        Voir les détails
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    elements.resultsContainer.innerHTML = html;
    
    // Ajouter des écouteurs d'événements pour les boutons de détails
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', () => {
            const itemId = button.dataset.id;
            const itemType = button.dataset.type;
            showItemDetails(itemId, itemType);
        });
    });
}

// Afficher les détails d'un élément
function showItemDetails(itemId, itemType) {
    fetchItemDetails(itemId, itemType)
        .then(details => {
            displayItemDetails(details, itemType);
        })
        .catch(error => {
            console.error(`Erreur lors du chargement des détails de ${itemId}:`, error);
            elements.resultsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Erreur de chargement</h3>
                    <p>Impossible de charger les détails demandés.</p>
                    <button class="back-button">Retour</button>
                </div>
            `;
            
            document.querySelector('.back-button').addEventListener('click', () => {
                showCategory(itemType);
            });
        });
}

// Récupérer les détails d'un élément
async function fetchItemDetails(itemId, itemType) {
    let filePath;
    
    // Déterminer le chemin du fichier en fonction du type
    if (itemType === 'skills') {
        filePath = 'data/skills.txt';
        // Pour les compétences, nous devrons extraire la compétence spécifique du fichier global
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Impossible de charger ${filePath}`);
        }
        
        const text = await response.text();
        return extractSkillDetails(text, itemId);
    } else {
        // Pour les autres types, chaque élément a son propre fichier
        filePath = `data/${itemType}/${itemId}.txt`;
        
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Impossible de charger ${filePath}`);
        }
        
        const text = await response.text();
        return {
            id: itemId,
            content: text
        };
    }
}

// Extraire les détails d'une compétence spécifique
function extractSkillDetails(text, skillId) {
    // Fonction permettant d'extraire une compétence spécifique du fichier global
    // Cette fonction sera adaptée en fonction du format de votre fichier skills.txt
    
    // Exemple simple: supposons que chaque compétence commence par son nom suivi de ":"
    const lines = text.split('\n');
    let inSkillSection = false;
    let skillContent = '';
    let skillName = '';
    
    for (const line of lines) {
        // Chercher le début de la compétence
        if (line.toLowerCase().includes(skillId.toLowerCase()) && line.includes(':')) {
            inSkillSection = true;
            skillName = line.split(':')[0].trim();
            skillContent = line + '\n';
        } 
        // Ajouter les lignes tant qu'on est dans la section de la compétence
        else if (inSkillSection) {
            // Si on trouve une ligne qui ressemble au début d'une autre compétence, on arrête
            if (line.includes(':') && line.trim().length > 0 && !line.startsWith(' ')) {
                break;
            }
            skillContent += line + '\n';
        }
    }
    
    return {
        id: skillId,
        name: skillName,
        content: skillContent.trim()
    };
}

// Afficher les détails d'un élément
function displayItemDetails(details, itemType) {
    const typeTitles = {
        'characters': 'Personnage',
        'locations': 'Lieu',
        'deities': 'Divinité',
        'skills': 'Compétence'
    };
    
    const html = `
        <div class="item-details">
            <button class="back-button" data-type="${itemType}">Retour à la liste</button>
            <h2>${details.name || `${typeTitles[itemType]} : ${details.id}`}</h2>
            <div class="content">
                ${formatContent(details.content)}
            </div>
        </div>
    `;
    
    elements.resultsContainer.innerHTML = html;
    
    // Ajouter l'écouteur d'événement pour le bouton de retour
    document.querySelector('.back-button').addEventListener('click', () => {
        showCategory(itemType);
    });
}

// Formater le contenu pour l'affichage
function formatContent(content) {
    // Convertir les sauts de ligne en paragraphes HTML
    const paragraphs = content.split('\n\n');
    
    return paragraphs
        .map(paragraph => {
            // Conserver les sauts de ligne simples dans les paragraphes
            const lines = paragraph.split('\n').map(line => line.trim());
            return `<p>${lines.join('<br>')}</p>`;
        })
        .join('');
}

// Gestion de l'envoi de message dans le chat
function handleChatSend() {
    const message = elements.chatInput.value.trim();
    if (message.length === 0) return;
    
    // Ajouter le message à l'interface
    addUserMessage(message);
    
    // Vider le champ de saisie
    elements.chatInput.value = '';
    
    // Traiter le message
    processChatMessage(message);
}

// Changer la vue active
function showView(view) {
    // Masquer toutes les vues
    elements.welcomeScreen.classList.add('hidden');
    elements.chatContainer.classList.add('hidden');
    elements.resultsContainer.classList.add('hidden');
    
    // Afficher la vue demandée
    switch (view) {
        case 'welcome':
            elements.welcomeScreen.classList.remove('hidden');
            break;
        case 'chat':
            elements.chatContainer.classList.remove('hidden');
            break;
        case 'results':
            elements.resultsContainer.classList.
