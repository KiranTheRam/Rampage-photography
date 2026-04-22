This directory is the code for my photography portfolio website. I     
  want you to make some changes. first, i want there to be a homepage    
  that offers the user different "Volumes" to choose from. each of these 
   will be a different set of photos, stored in different folders to     
  make it easier to manage. This homepage should keep the same asthetic  
  as the rest of the site, but make it fun and feel alive and engaging.  
  Once the user clicks on a volume, it will open up a page that looks    
  the way that the sit looks now. each volume will of course have        
  different images, and the text at the top can be different between     
  them, but the style and everything should be the same (we are          
  essentially moving the surrent homepage into seconday pages). The way  
  photos will load will be from folders that have the names of their     
  volumes. The docker container will still map a /photos directory from  
  the host. this directory is expected to have folders with photos. For  
  example, the current photos should be in a volume/folder named         
  "Archive". Then another folder can be "Street_Studies" and it contains 
   urban photography. Ask me any questions you have. I have added a      
  "Street_Studies" folder with photos that you can use to build the      
  site. I will need a way to add more archives in the future. I will     
  want to do this via the UI, where I can set up a new volume, and it    
  will create the folder in the docker mounted host path. I should be    
  able to add photos via the UI, or just add them via the filesystem and 
   restart the container. The dynamic loading of photos that is          
  currently in use should work the same across all the folders. Finally, 
   move the current photos to an "Archive" directory that lives inside   
  the existing photos directory.
