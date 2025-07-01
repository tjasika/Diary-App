# Diary App 📖

### File Set-Up


### The Database
I created my database in MySQL Workbench. It has two tables: *User* and *Entry*.
The *User* table stores people's email, username, password (crypted), the date when they created their account and the date when they last logged in.
The *Entry* table stores the entry's title, date and content, and is connected to the *User* table via a foreign key.

### User authentification
The user authentification was not my primary goal for this project, so I kept it simple. The email and the username must be unique, but the email is not verified (I only used the 'email' input type).  
![Screenshot of the project interface](assets/screenshot1.png)

### Styling
I went with a clean, modern, and simple look. I’m not a pro designer, but I used a bit of AI to help me get a good layout and made sure the interface works well for the app. 
The color palette is from *Material Palette* (https://www.materialpalette.com), the illustrations are from *StorySet* (https://storyset.com/people) , and the icons are from *Bootstrap Icons* (https://icons.getbootstrap.com/)

