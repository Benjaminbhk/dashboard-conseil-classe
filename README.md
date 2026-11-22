# Dashboard du conseil de classe

Application locale pour projeter, en conseil de classe, un écran lisible par élève (à 3 m et plus) :
moyennes par pôle, comparaison avec la fin de 3e, mots-clés des appréciations (idées
regroupées, en vert ou rouge, marquées « 3e » si déjà relevées en 3e), synthèse des appréciations du
trimestre, assiduité (en rouge au-delà de 10 demi-journées). Une vue d'ensemble de la classe ouvre la présentation.

## Utilisation

1. Télécharger le dépôt (bouton **Code → Download ZIP**) et le décompresser.
2. Ouvrir `index.html` dans Chrome, Edge ou Firefox (double-clic). Aucune installation, aucun serveur, fonctionne hors ligne.
3. **Importer le classeur** « Suivi des élèves » (.xlsx), par le bouton ou en le glissant sur la page.
4. Dans le tableau : corriger une moyenne si besoin (case jaune = corrigée à la main ; un nouvel import ne l'écrase pas).
5. Cliquer sur un élève : rédiger la synthèse des appréciations (une ligne par point, la matière entre parenthèses),
   ajouter une photo ; l'aperçu se met à jour en direct.
6. **▶ Présenter** : plein écran, `←` `→` pour naviguer, `L` pour la liste des élèves, `Échap` pour revenir à l'admin.

### Mettre à jour depuis Pronote (juste avant le conseil)

Bouton **Coller depuis Pronote** : glisser une fois le favori « 📋 Extraire Pronote » dans la barre de favoris.
Ensuite, dans Pronote (Bulletins → Bulletin, classe et trimestre choisis), cliquer sur ce favori : il passe d'un élève
à l'autre en lecture seule (environ 1 minute) et affiche un texte à copier. Le coller dans l'appli met à jour les
moyennes, les appréciations du trimestre et la vie scolaire de chaque élève. Si le favori est bloqué, le même script
peut être collé dans la console du navigateur (F12).

Autre possibilité : réimporter le nouveau classeur. Les synthèses, photos, logo et
corrections manuelles sont conservés.

## Confidentialité

- Les données (notes, appréciations, photos) sont stockées **uniquement dans le navigateur** de l'ordinateur
  (IndexedDB). Rien n'est envoyé sur Internet.
- **Sauvegarder (.json)** exporte tout dans un fichier, pour changer d'ordinateur ou garder une copie.
  Ce fichier contient des données d'élèves : ne pas le mettre dans le dépôt (le `.gitignore` l'exclut).
- Le dépôt ne contient que le code.

## Structure

| Fichier | Rôle |
|---|---|
| `js/config.js` | Pôles, correspondance des matières Pronote 2nde ↔ 3e, liste des mots-clés et synonymes (à adapter) |
| `js/import-xlsx.js` | Lecture du classeur d'extraction Pronote |
| `js/model.js` | Calculs : moyennes par pôle, moyennes de classe, profil |
| `js/present.js` | Rendu des écrans (1920×1080) |
| `js/pronote.js` | Extracteur à lancer dans Pronote + import du texte collé |
| `js/app.js` | Admin, stockage, présentation |
| `vendor/xlsx.core.min.js` | SheetJS 0.18.5 (Apache 2.0) pour lire les .xlsx |

Les moyennes sont non pondérées (l'extract ne contient pas les coefficients).

## À venir

- Photos des élèves depuis Pronote.
