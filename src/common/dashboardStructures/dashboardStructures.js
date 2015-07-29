angular.module('adf.structures', ['adf'])
.config(function(dashboardProvider){
  
  dashboardProvider
    .structure('Template A', {
      image:"assets/templateA.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-6',
          widgets: []
        }, {
          styleClass: 'col-md-6',
          widgets: []
        }]
      }]
    })
    .structure('Template B', {
      image:"assets/templateB.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-12',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        }, {
          styleClass: 'col-md-8',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-10',
          widgets: []
        }]
      }]
    })
    .structure('Template C', {
      image:"assets/templateC.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-12'
        }]
      }, {
        columns: [{
          styleClass: 'col-md-4'
        }, {
          styleClass: 'col-md-4'
        }, {
          styleClass: 'col-md-4'
        }]
      }]
    })


    .structure('Template D', {
      image:"assets/templateD.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-4'
        }, {
          styleClass: 'col-md-4'
        }, {
          styleClass: 'col-md-4'
        }]
      }]
    }) 


    .structure('Template E', {
      image:"assets/templateE.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-12'
        }]
      }, {
        columns: [{
          styleClass: 'col-md-6'
        }, {
          styleClass: 'col-md-6'
        }]
      }]
    })
    .structure('Template F', {
      image:"assets/templateF.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-12'
        }]
      }, {
        columns: [{
          styleClass: 'col-md-6'
        }, {
          styleClass: 'col-md-6'
        }]
      }, {
        columns: [{
          styleClass: 'col-md-12'
        }]
      }]
    })
    


    .structure('Template G', {
      image:"assets/templateG.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-3',
          widgets: []
        }, {
          styleClass: 'col-md-9 hidden',
          widgets: []
        }]
      }]
    })



    
.structure('Template H', {
      image:"assets/templateH.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-3',
          widgets: []
        },{
          styleClass: 'col-md-6',
          widgets: []
        },{
          styleClass: 'col-md-3',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-12',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        }, {
          styleClass: 'col-md-8',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-10',
          widgets: []
        }]
      }]
    })

.structure('Template I', {
      image:"assets/templateJ.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-12',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        }, {
          styleClass: 'col-md-8',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-10',
          widgets: []
        }]
      }]
    })

.structure('Template J', {
      image:"assets/templateJ.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },
      {
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-4',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-12',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        }, {
          styleClass: 'col-md-8',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-10',
          widgets: []
        }]
      }]
    })


.structure('Template K', {
      image:"assets/templateK.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-4',
          widgets: []
        },{
          styleClass: 'col-md-4',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        },{
          styleClass: 'col-md-2',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-12',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-4',
          widgets: []
        }, {
          styleClass: 'col-md-8',
          widgets: []
        }]
      },{
        columns: [{
          styleClass: 'col-md-2',
          widgets: []
        }, {
          styleClass: 'col-md-10',
          widgets: []
        }]
      }]
    })




    .structure('Template L', {
      image:"assets/templateL.png",
      rows: [{
        columns: [{
          styleClass: 'col-md-3   pull-right ',
          widgets: []
        }, {
          styleClass: ' ',
          widgets: []
        }]
      }]
    });
});
