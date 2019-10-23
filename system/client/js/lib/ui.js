"use strict";

// based on GLSLEditor classes

  class MenuItem {
    constructor (container, className, name, onClick) {
        this.el = document.createElement('li');
        this.button = document.createElement('button');
        this.button.className = className + '_button';
        this.el.appendChild(this.button);
        this.el.setAttribute('class', className);
        this.nameInit = name;
        this.currName = name;
        this.button.innerHTML = name;
        this.className = className;
        this.hiddenClass = className + '--hidden';
        this.el.backgroundColor = "green";

        // Attach listeners, including those for tooltip behavior
        this.button.addEventListener('click', onClick, true);

        if (container) {
            container.appendChild(this.el);
        }
    }
	
	get name () {
		return this.currName;
	}
    set name (name) {
        this.button.innerHTML = name;
        this.currName = name;
    }

    hide () {
        this.el.setAttribute('class', this.className + ' ' + this.hiddenClass);
    }

    show () {
        this.el.setAttribute('class', this.className);
    }
  }
  
  class Menu {
    constructor() {
      this.menus = {};
      this.el = document.createElement("ul");
      this.el.setAttribute("id", "menu");
      this.el.setAttribute('class', 'ge_menu_bar');

    //   let main = {autoupdate : false};
    // this.fileInput = document.createElement('input');
    // this.fileInput.setAttribute('type', 'file');
    // this.fileInput.setAttribute('accept', 'text/x-yaml');
    // this.fileInput.style.display = 'none';
    // this.fileInput.addEventListener('change', (event) => {
    //     //main.open(event.target.files[0]);
    // });
    // this.menus.open = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">folder_open</i>  Open', (event) => {
    //     //this.fileInput.click();
    // });

    // // this.menus.autoupdate.button.style.color = main.autoupdate ? 'white' : 'gray';

    // // TEST
    // this.menus.test = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">timeline</i> Test', (event) => {
    //     //main.visualDebugger.check();
    // });

    // // SHARE
    // this.menus.share = new MenuItem(this.el, 'ge_menu', '<i class="material-icons">arrow_upward</i> Export', (event) => {
    //     if (main.change || !this.exportModal) {
    //         //this.exportModal = new ExportModal('ge_export', { main: main, position: 'fixed' });
    //     }

    //     //let bbox = this.menus.share.el.getBoundingClientRect();
    //     //this.exportModal.presentModal(bbox.left - 5, bbox.top + bbox.height + 5);
    // });


    // // AUTOUPDATE
    // this.menus.autoupdate = new MenuItem(this.el, 'ge_menu', ' <i class="material-icons">autorenew</i> Update: ON', (event) => {
    //     if (main.autoupdate) {
    //         main.autoupdate = false;
    //         this.menus.autoupdate.name = '<i class="material-icons">autorenew</i> Update: OFF';
    //         // this.menus.autoupdate.button.style.color = 'gray';
    //     }
    //     else {
    //         main.autoupdate = true;
    //         //main.update();
    //         this.menus.autoupdate.name = '<i class="material-icons">autorenew</i> Update: ON';
    //         // this.menus.autoupdate.button.style.color = 'white';
    //     }
    // });
      
        document.body.appendChild(this.el);
        

        //


    }

    addMenuItem(name, callback) {

    }
  }
  window.createVerticalMenuElement = function() {
      const div = document.createElement("div");
      div.classList.add("vertical-menu");
      window.CLICKMENU = function(id) {
        console.log("WEE", id)
          const el = document.getElementById(id);
          el.classList = "active";
          MR.wrangler.doWorldTransition({direction : null, key : id, broadcast : true}); 
          MR.wrangler.menu.enableDisableWorldsScroll();     

          window.DISABLEMENUFORWORLDSEXCEPT(id);   
      }
      window.DISABLEMENUFORWORLDSEXCEPT = function(id) {
        const worldsMenuItems = div.getElementsByTagName("div");
        console.log(worldsMenuItems);

        id = parseInt(id);
        for (let i = 0; i < id; i += 1) {
          worldsMenuItems[i].classList.remove("active");
        }
        for (let i = id + 1; i < worldsMenuItems.length; i += 1) {
          worldsMenuItems[i].classList.remove("active");
        }
        worldsMenuItems[id].classList.add("active");
      }
      div.innerHTML = `
      <div id=0 onclick="window.CLICKMENU(this.id)
      ">A</div>
      <div id=1 onclick="window.CLICKMENU(this.id)
      ">B</div>
      <div id=2 onclick="window.CLICKMENU(this.id)
      ">C</div>
      <div id=3 onclick=" window.CLICKMENU(this.id)
      ">D</div>`;


    return div;
  }
  window.Menu = Menu;
  window.MenuItem = MenuItem;