# Documentation Légale PhytoCheck

Ce dossier contient les documents légaux de l'application PhytoCheck :

- **privacy-policy.html** : Politique de confidentialité
- **terms-of-service.html** : Conditions générales d'utilisation
- **index.html** : Page d'accueil avec liens vers les documents

## Publication sur GitHub Pages

### Étape 1 : Pousser les fichiers sur GitHub

```bash
git add docs/
git commit -m "Ajout de la documentation légale"
git push origin main
```

### Étape 2 : Activer GitHub Pages

1. Allez sur https://github.com/elkaou/phytocheck-app
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Pages**
4. Sous "Source", sélectionnez **Deploy from a branch**
5. Sous "Branch", sélectionnez **main** et **/docs**
6. Cliquez sur **Save**

### Étape 3 : Attendre la publication

GitHub Pages va automatiquement déployer votre site. Cela prend généralement 1-2 minutes.

### Étape 4 : Vérifier les URLs

Une fois publié, vos documents seront accessibles aux URLs suivantes :

- **Page d'accueil** : https://elkaou.github.io/phytocheck-app/
- **Politique de confidentialité** : https://elkaou.github.io/phytocheck-app/privacy-policy.html
- **Conditions d'utilisation** : https://elkaou.github.io/phytocheck-app/terms-of-service.html

## Utilisation dans Google Play Console

### Pour la Politique de Confidentialité

1. Allez dans Google Play Console
2. Votre application → **Règles** → **Confidentialité de l'application**
3. Ajoutez l'URL : `https://elkaou.github.io/phytocheck-app/privacy-policy.html`
4. Sauvegardez

### Pour les Conditions d'Utilisation

1. Allez dans Google Play Console
2. Votre application → **Contenu de l'application** → **Conditions d'utilisation**
3. Ajoutez l'URL : `https://elkaou.github.io/phytocheck-app/terms-of-service.html`
4. Sauvegardez

## Modification des documents

Pour modifier les documents :

1. Éditez les fichiers `.html` dans le dossier `docs/`
2. Committez et poussez les modifications sur GitHub
3. GitHub Pages mettra automatiquement à jour le site (1-2 minutes)

## Personnalisation

N'oubliez pas de remplacer `votre-email@example.com` par votre vraie adresse email dans :
- `privacy-policy.html`
- `terms-of-service.html`
- `PRIVACY_POLICY.md`
- `TERMS_OF_SERVICE.md`

## Versions Markdown

Les fichiers `.md` sont des versions texte des documents pour référence et édition facile :
- `PRIVACY_POLICY.md`
- `TERMS_OF_SERVICE.md`

Ces fichiers ne sont pas publiés sur GitHub Pages, seuls les fichiers `.html` le sont.
