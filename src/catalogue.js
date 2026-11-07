// Room, equipment, staff and ailment catalogue.
export const ROOM_TYPES={
 gp:{name:'GP office',short:'GP',color:'#bed2bb',wall:'#6f967c',base:900,tile:90,min:3,staff:'doctor',required:['desk','exam'],time:10,fee:380,description:'Every cure begins with a diagnosis.'},
 pharmacy:{name:'Pharmacy',short:'RX',color:'#d8d9b6',wall:'#a2ad73',base:1200,tile:95,min:3,staff:'nurse',required:['pharmacy'],time:12,fee:1350,description:'A prescription for modern life.'},
 ward:{name:'Ward',short:'WD',color:'#b9d2d0',wall:'#6a9d9b',base:1600,tile:95,min:4,staff:'nurse',required:['bed'],time:21,fee:1900,description:'A little rest. A very itemized bill.'},
 scanner:{name:'Diagnostics',short:'DX',color:'#c9c4dc',wall:'#9184b1',base:2200,tile:110,min:4,staff:'specialist',required:['scanner'],time:16,fee:2400,unlock:6,description:'Look deeper. Invoice accordingly.'},
 surgery:{name:'Surgery',short:'OR',color:'#dbbec3',wall:'#ae7d86',base:3200,tile:125,min:4,staff:'specialist',required:['operating'],time:23,fee:3400,unlock:16,description:'Precision care for improbable ailments.'},
 research:{name:'Research lab',short:'LAB',color:'#c8d5df',wall:'#7a97ab',base:1600,tile:90,min:3,staff:'researcher',required:['console'],description:'Turn good ideas into better care.'},
 staff:{name:'Staff room',short:'TEA',color:'#e5cfaf',wall:'#b69a70',base:650,tile:65,min:3,staff:null,required:['sofa'],description:'Because doctors are people, allegedly.'},
 toilets:{name:'Toilets',short:'WC',color:'#d4d9dc',wall:'#8d9da5',base:600,tile:65,min:3,staff:null,required:['toilet','sink'],description:'The foundation of civilized medicine.'},
};
export const EQUIPMENT={
 desk:{name:'Doctor desk',cost:1100,w:1,h:1,rooms:['gp'],model:'desk',description:'Required in a GP office.'},
 exam:{name:'Examination couch',cost:850,w:1,h:2,rooms:['gp'],model:'bed',description:'Required in a GP office.'},
 pharmacy:{name:'Medicine cabinet',cost:1600,w:1,h:1,rooms:['pharmacy'],model:'pharmacy',description:'Required in a pharmacy.'},
 bed:{name:'Hospital bed',cost:950,w:1,h:2,rooms:['ward'],model:'bed',description:'Each bed accommodates another inpatient.'},
 scanner:{name:'Diagnostic scanner',cost:4200,w:2,h:2,rooms:['scanner'],model:'scanner',description:'Required in Diagnostics.'},
 operating:{name:'Operating table',cost:5200,w:1,h:2,rooms:['surgery'],model:'bed',description:'Required in Surgery.'},
 console:{name:'Research workstation',cost:1800,w:1,h:1,rooms:['research'],model:'desk',description:'A researcher needs one to develop improvements.'},
 sofa:{name:'Comfortable sofa',cost:450,w:2,h:1,rooms:['staff'],model:'sofa',description:'Restores staff energy.'},
 toilet:{name:'Toilet cubicle',cost:350,w:1,h:1,rooms:['toilets'],description:'An essential public service.'},
 sink:{name:'Wash basin',cost:200,w:1,h:1,rooms:['toilets'],description:'Required for working toilets.'},
 bench:{name:'Waiting bench',cost:220,w:2,h:1,corridor:true,model:'sofa',description:'Nearby patients wait more patiently.'},
 plant:{name:'Potted plant',cost:100,w:1,h:1,any:true,model:'plant',description:'Makes the hospital feel cared for.'},
 vending:{name:'Drinks machine',cost:650,w:1,h:1,corridor:true,description:'Refreshments improve patient comfort.'},
 bin:{name:'Litter bin',cost:80,w:1,h:1,corridor:true,description:'A cleaner hospital is a happier hospital.'},
 radiator:{name:'Radiator',cost:180,w:1,h:1,any:true,description:'Comfort, without a prescription.'},
};
export const STAFF_TYPES={
 doctor:{name:'Doctor',cost:1200,wage:480,color:'#f6f2de',description:'Diagnoses patients in GP offices.'},
 nurse:{name:'Nurse',cost:900,wage:350,color:'#75aaa6',description:'Works in pharmacies and wards.'},
 specialist:{name:'Specialist',cost:1900,wage:700,color:'#ad99c0',description:'Runs scanners and surgery.'},
 janitor:{name:'Caretaker',cost:650,wage:240,color:'#cc9563',description:'Repairs machines and keeps things clean.'},
 researcher:{name:'Researcher',cost:1500,wage:550,color:'#8ca6bf',description:'Develops hospital-wide improvements in a lab.'},
};
export const CONDITIONS=[
 {name:'Chronic Mondays',treatment:'pharmacy',color:'#d59b5c'},
 {name:'Inbox inflammation',treatment:'pharmacy',color:'#a4b2cb'},
 {name:'Executive exhaustion',treatment:'ward',color:'#b38eae'},
 {name:'Acute overthinking',treatment:'ward',color:'#99b49c'},
 {name:'Imaginary hiccups',treatment:'scanner',color:'#cab875',unlock:6},
 {name:'Spontaneous paperwork',treatment:'surgery',color:'#b68476',unlock:16},
];
