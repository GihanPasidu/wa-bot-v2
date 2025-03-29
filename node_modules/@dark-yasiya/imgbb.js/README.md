<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=200px src="https://raw.githubusercontent.com/DarkYasiyaofc/FROZEN-HARD/main/IMAGES/imgbb.jpg" alt="IMGBB"></a>
</p>

<h2 align="center">Imgbb Scraper</h2>


---

<p align="center"> The unofficial Scrap [ https://imgbb.com/ ]
    <br> 
</p>

## 📝 Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Authors](#authors)

## 🧐 About <a name = "about"></a>

The unofficial Scraper for [ https://imgbb.com/ ]

## 🏁 Getting Started <a name = "getting_started"></a>

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing


```sh
yarn add @dark-yasiya/imgbb.js
```

or

```sh
npm i @dark-yasiya/imgbb.js
```

## 🍟 Usage <a name="usage"></a>

```ts
const { image2url } = require('@dark-yasiya/imgbb.js')
```

## Use

```ts

const { image2url } = require("@dark-yasiya/imgbb.js");
const path = require('path');

(async () => {
    const filePath = path.join(__dirname, './image/imgbb.jpg'); // Provide your image path
    const result = await image2url(filePath);

    console.log(result);
})();

```
```ts
{
  status: 'true',
  creator: 'DarkYasiya',
  result: {
    name: 'imgbb',
    extension: 'jpg',
    width: 733,
    height: 208,
    size: 16450,
    time: 1731638522,
    expiration: 0,
    likes: 0,
    description: null,
    original_filename: 'imgbb.jpg',
    is_animated: 0,
    is_360: 0,
    nsfw: 0,
    id_encoded: 'ydyPLSK',
    size_formatted: '16.5 KB',
    filename: 'imgbb.jpg',
    url: 'https://i.ibb.co/17qQH6B/imgbb.jpg',
    url_viewer: 'https://ibb.co/ydyPLSK',
    url_viewer_preview: 'https://ibb.co/ydyPLSK',
    url_viewer_thumb: 'https://ibb.co/ydyPLSK',
    image: {
      filename: 'imgbb.jpg',
      name: 'imgbb',
      mime: 'image/jpeg',
      extension: 'jpg',
      url: 'https://i.ibb.co/17qQH6B/imgbb.jpg',
      size: 16450
    },
    thumb: {
      filename: 'imgbb.jpg',
      name: 'imgbb',
      mime: 'image/jpeg',
      extension: 'jpg',
      url: 'https://i.ibb.co/ydyPLSK/imgbb.jpg'
    },
    medium: {
      filename: 'imgbb.jpg',
      name: 'imgbb',
      mime: 'image/jpeg',
      extension: 'jpg',
      url: 'https://i.ibb.co/YPkQvZJ/imgbb.jpg'
    },
    display_url: 'https://i.ibb.co/YPkQvZJ/imgbb.jpg',
    display_width: 733,
    display_height: 208,
    delete_url: 'https://ibb.co/ydyPLSK/6c69949399ebd29bc37e80a4342e854f',
    views_label: 'views',
    likes_label: 'likes',
    how_long_ago: 'moments ago',
    date_fixed_peer: '2024-11-15 02:42:02',
    title: 'imgbb',
    title_truncated: 'imgbb',
    title_truncated_html: 'imgbb',
    is_use_loader: false
  }
}
```

## 🖋 Authors <a name = "authors"></a>

- [@DarkYasiya](https://github.com/DarkYasiyaofc) - scraped author
