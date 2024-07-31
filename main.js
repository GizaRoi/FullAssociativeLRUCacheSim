document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('runSimulationButton').addEventListener('click', function(e) {
        e.preventDefault();
    
        //these values should take more inputs for validating the input
        const blockSize = parseInt(document.getElementById('blockSize').value);
        var mmBlock;
        var cacheBlock;
        var hitMode;
        var missMode;
        
        if(document.getElementById('writeBack').checked){ //writeBack: hitMode is 0
            hitMode = 0;
        } else {hitMode = 1;} //writeThrough: hitMode is 1
        
        if(document.getElementById("writeOnAllocate").checked){ //writeOnAllocate: missMode is 0
            missMode = 0;
        } else {missMode = 1;} //writeAround: missMode is 1
        
        if (document.getElementById('Block1').checked) {
            mmBlock = document.getElementById('Block1').value === 'true';
        } else {
            mmBlock = false;
        }
        
        if (document.getElementById('Block2').checked) {
            cacheBlock = document.getElementById('Block2').value === 'true';
        } else {
            cacheBlock = false;
        }
        
        const mmSize = parseInt(document.getElementById('mmSize').value);
        const cacheSize = parseInt(document.getElementById('cacheSize').value);
        const programFlow = document.getElementById('programFlow').value.split(',').map(Number);
        mmTime = parseInt(document.getElementById('mmTime').value);
        cacheTime = parseInt(document.getElementById('cacheTime').value);

    
        const simulator = new CacheSimulator(blockSize, mmSize, mmBlock, cacheSize, cacheBlock, programFlow, hitMode, missMode, mmTime, cacheTime);
    
        // validate the contents of the form through output of validate function of cachesimulator
        ContinueSimulationFlag = simulator.validate(programFlow);
    
        // if valid, then continue with the simulation
        // for the meantime insert warning that the input is valid
        if (ContinueSimulationFlag) {
            alert("Input is valid, proceeding with simulation");
            simulator.runProgramFlow(programFlow);
            simulator.getStats(); // this should update the displays of the index.html
            if(document.getElementById('download-container').innerHTML.length == 0){
                document.getElementById('download-container').innerHTML += "<button id=\"download\"> Download Output </button>";
            }
            document.getElementById('download').addEventListener('click', function() {
                const text = simulator.createTxt(simulator.cacheHitRate, simulator.cacheMissRate, simulator.averageMemoryAccessTime, simulator.totalMemoryAccessTime);
                const blob = new Blob([text], { type: 'text/plain' });
                const link = document.createElement('a');
                link.download = 'output.txt';
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
        else {
            alert("Input is invalid, please check the values of the input");
        }
    
        // else, display an error message
    });
    
});

//event listeners for the radio buttons
function handleRadioChange(selectedRadio) {
    const radioButtons = document.querySelectorAll('input[type="radio"][name="Block1"], input[type="radio"][name="Word1"]');

    radioButtons.forEach(radio => {
        if (radio !== selectedRadio) {
            radio.checked = false; // Uncheck the other radio button
        }
    });
}

function handleRadioChange2(selectedRadio) {
    const radioButtons = document.querySelectorAll('input[type="radio"][name="Block2"], input[type="radio"][name="Word2"]');

    radioButtons.forEach(radio => {
        if (radio !== selectedRadio) {
            radio.checked = false; // Uncheck the other radio button
        }
    });
}

function handleRadioChange3(selectedRadio) {
    const radioButtons = document.querySelectorAll('input[type="radio"][name="writeBack"], input[type="radio"][name="writeThrough"]');

    radioButtons.forEach(radio => {
        if (radio !== selectedRadio) {
            radio.checked = false; // Uncheck the other radio button
        }
    });
}

function handleRadioChange4(selectedRadio) {
    const radioButtons = document.querySelectorAll('input[type="radio"][name="writeOnAllocate"], input[type="radio"][name="writeAround"]');

    radioButtons.forEach(radio => {
        if (radio !== selectedRadio) {
            radio.checked = false; // Uncheck the other radio button
        }
    });
}

function calcHitTime(hitMode, cacheTime, mmTime){
    if(hitMode == 0){ //writeBack
        return cacheTime;
    }
    else { //writeThrough
        return cacheTime + mmTime;
    }
}

function calcMissPenalty(missMode, cacheTime, mmTime, blockSize){
    if(missMode == 0){ //writeOnAllocate
        return cacheTime +  (blockSize * mmTime) + cacheTime + mmTime;
    } else { //writeAround
        return cacheTime + mmTime;
    }
}


function addRow(block, age, data) {
    // Select the table element by its ID
    let table = document.getElementById('resultsTable');

    // Create a new row
    let newRow = table.insertRow();
    newRow.classList.add('row-results'); // Add the 'row-results' class to the new row

    // Create and insert new cells (td elements)
    let blockCell = newRow.insertCell(0);
    let ageCell = newRow.insertCell(1);
    let dataCell = newRow.insertCell(2);

    // Set the text content of the cells
    blockCell.textContent = block;
    ageCell.textContent = age;
    dataCell.textContent = data;
}

class CacheSimulator {

    //constructor should take into account whether word or block is used
    constructor(blockSize, mmSize, mmBlock, cacheSize, cacheBlock, programFlow, hitMode, missMode, mmTime, cacheTime) {
        this.blockSize = blockSize;
        this.mmSize = mmSize;
        this.mmBlock = mmBlock; //true if block, false if word
        this.cacheSize = cacheSize;
        this.cacheBlock = cacheBlock; //true if block, false if word
        this.programFlow = programFlow;
        this.hitMode = hitMode;
        this.missMode = missMode;
        this.mmTime = mmTime;
        this.cacheTime = cacheTime;
        this.hitTime = calcHitTime(hitMode, cacheTime, mmTime);
        this.missPenalty = calcMissPenalty(missMode, cacheTime, mmTime, blockSize);
        this.cache = []; // to update sa validation
        this.ages = []; // to update sa validation, then iteratively update sa accessMemory
        //this.lruQueue = [];
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.totalMemoryAccessTime = 0;
        this.memoryAccesses = 0;
    }

    //Index is -1 if the block to be placed is new
    ageCacheBlocks(IndexofNewplacedBlock){
        for (var i = 0; i < this.ages.length; i++){
            if (i == IndexofNewplacedBlock){
                this.ages[i] = 0;
            }
            else{
                this.ages[i]++;
            }
        }
    }

    ageCacheBlocks2(IndexofCacheHitBlock) { // replaces the current 0 with 1, and the index of the cache hit block with 0
        // this.ages[this.ages.indexOf(0)] = 1;
        // this.ages[IndexofCacheHitBlock] = 0;
        // obtain the age of the cache hit block
        var cacheHitBlockAge = this.ages[IndexofCacheHitBlock];
        // for all ages in the cache less than the age of the cache hit block, increment the age
        for (var i = 0; i < this.ages.length; i++) {
            if (this.ages[i] < cacheHitBlockAge) {
                this.ages[i]++;
            }
        }

        this.ages[IndexofCacheHitBlock] = 0;
    }

    FindIndexofHighestAge() {
        var maxAge = 0;
        var index = 0;
        for (var i = 0; i < this.ages.length; i++) {
            if (this.ages[i] > maxAge) {
                maxAge = this.ages[i];
                index = i;
            }
        }
        return index;
    }

    accessMemory(address) {
        
        this.memoryAccesses++;
        const blockAddress = address; // we are full associative, so block address is the same as the memory address

        if (this.cache.includes(blockAddress)) { // cache hit, update age of all blocks except the one that was accessed
            this.totalMemoryAccessTime += this.hitTime;
            this.cacheHits++; // this is right
            this.ageCacheBlocks2(this.cache.indexOf(blockAddress));
        } else { // cache miss, add address to cacheblock of highest age
            this.cacheMisses++;
            if (this.cache.length >= this.cacheSize) { // cache size met, this means we need to replace the oldest "block"
                // add new block to the cache "associated to age"
                //find the index of the highest age
                this.totalMemoryAccessTime += this.missPenalty;
                const OldestAgeIndex = this.FindIndexofHighestAge();
                //replace the block with the highest age
                this.cache[OldestAgeIndex] = blockAddress;
                //update the ages of all blocks
                this.ageCacheBlocks(OldestAgeIndex);
            }
            else { // cache size not met, just add the block
                // add new block to the cache "associated to age"
                this.totalMemoryAccessTime += this.cacheTime + this.hitTime;
                this.ageCacheBlocks(-1); // -1 means that block is new
                this.ages.push(0);
                this.cache.push(blockAddress);
            }
        }

        //debugging: display in console the cache and ages
        //console.log("Cache: " + this.cache);
        //console.log("Ages: " + this.ages);
    }

    validate(programFlow) {
        var continueSimulation = false;

        if (this.blockSize <= 0) {
            alert("Block size must be greater than 0");
            return continueSimulation;
        }
        else if (this.mmSize <= 0) {
            alert("Memory size must be greater than 0");
            return continueSimulation;
        }
        else if (this.cacheSize <= 0) {
            alert("Cache size must be greater than 0");
            return continueSimulation;
        }
        else if (!this.mmBlock & this.mmSize % this.blockSize !== 0) {
            alert("Memory size (in word) must be divisible by block size");
            return continueSimulation;
        }
        else if (!this.cacheBlock & this.cacheSize % this.blockSize !== 0) {
            alert("Cache size (in word) must be divisible by block size");
            return continueSimulation;
        }

        //program flow validation
        var highest_mmAddress;
        if (this.mmBlock) {
            highest_mmAddress = this.mmSize * this.blockSize - 1;
        }
        else {
            highest_mmAddress = this.mmSize - 1;
        }

        for (var i = 0; i < programFlow.length; i++) {
            if (programFlow[i] > highest_mmAddress) {
                alert("Program flow contains an address that exceeds the memory size");
                return continueSimulation;
            }
            else if (programFlow[i] < 0) {
                alert("Program flow contains a negative address");
                return continueSimulation;
            }
        }

        alert("Program Flow: " + programFlow.join(", "));

        if (!this.mmBlock) {
            this.mmSize = this.mmSize / this.blockSize;
        }
        if (!this.cacheBlock) {
            this.cacheSize = this.cacheSize / this.blockSize;
        }
        continueSimulation = true;
        return continueSimulation;
    }

    runProgramFlow(programFlow) {
        programFlow.forEach(address => this.accessMemory(address));
    }

    getStats() {
        //unsure what for
        const totalcacheHitsandMiss = this.cacheHits + this.cacheMisses;

        // for label element "cacheHitStat"
        const cacheHitRate_str1 = this.cacheHits.toString()+"/"+totalcacheHitsandMiss.toString();
        const cacheHitRate_str2 = ((this.cacheHits / totalcacheHitsandMiss) * 100).toString() + "%";
        const cacheHitRate = cacheHitRate_str1 + " (" + cacheHitRate_str2 + ")";
        // for label element "cacheMissStat"
        const cacheMissRate_str1 = this.cacheMisses.toString()+"/"+totalcacheHitsandMiss.toString();
        const cacheMissRate_str2 = ((this.cacheMisses / totalcacheHitsandMiss) * 100).toString() + "%";
        const cacheMissRate = cacheMissRate_str1 + " (" + cacheMissRate_str2 + ")";

        // for label element "missPenaltyStat"
        const missPenalty = this.missPenalty.toString() + " ns";
        
        // for label element "totalMemTimeStat"
        const totalMemoryAccessTime = this.totalMemoryAccessTime.toString() + " ns";

        // for label element "avgMemTimeStat"
        const averageMemoryAccessTime = (this.totalMemoryAccessTime/this.memoryAccesses).toString() + " ns";

        // code to modify the index.html
        document.getElementById('cacheHitStat').innerHTML = cacheHitRate;
        document.getElementById('cacheMissStat').innerHTML = cacheMissRate;
        document.getElementById('missPenaltyStat').innerHTML = missPenalty;
        document.getElementById('totalMemTimeStat').innerHTML = totalMemoryAccessTime;
        document.getElementById('avgMemTimeStat').innerHTML = averageMemoryAccessTime;

        // display the cache
        this.cacheHitRate = cacheHitRate;
        this.cacheMissRate = cacheMissRate;
        this.totalMemoryAccessTime = totalMemoryAccessTime;
        this.averageMemoryAccessTime = averageMemoryAccessTime;
        this.displayCache();
    }

    createTxt(cacheHitRate, cacheMissRate, averageMemoryAccessTime, totalMemoryAccessTime) {
        var hitModeTxt, missModeTxt, mmBlockTxt, cacheBlockTxt;
        if(this.hitMode == 0){
            hitModeTxt = 'Write Back';
        } else {hitModeTxt = 'Write Through';}

        if(this.missMode == 0){
            missModeTxt = 'Write On Allocate'
        } else {missModeTxt = 'Write Around'}

        if(this.mmBlock == 1){
            mmBlockTxt = ' Block/s';
        } else {mmBlockTxt = ' Word/s';}

        if(this.cacheBlock == 1){
            cacheBlockTxt = ' Block/s';
        } else {cacheBlockTxt = ' Word/s';}

        var cacheSnapShotTxt = '';

        for(let i = 0; i < this.cache.length; i++){
            cacheSnapShotTxt += '\t'+i+' \t\t\t'+this.ages[i]+' \t\t\t'+this.cache[i]+'\n';
        }

        var text = 'Cache Hit Write Mode: ' + hitModeTxt +
                    '\nCache Miss Write Mode: ' + missModeTxt +
                    '\nCache Access Time: ' + this.cacheTime + ' ns' +
                    '\nMemory Access Time: ' + this.mmTime + ' ns'+
                    '\nBlock Size: ' + this.blockSize +
                    '\nMain Memory Size: ' + this.mmSize + mmBlockTxt +
                    '\nCache Size: ' + this.cacheSize + cacheBlockTxt +
                    '\nProgram Flow: '+ document.getElementById('programFlow').value +
                    '\n\nStatistics (Full Associative, LRU)\n\n'+
                    'Cache Hits: ' + cacheHitRate +
                    '\nCache Miss: ' + cacheMissRate +
                    '\nMiss Penalty: ' + this.missPenalty + 
                    '\nAvg. Memory Access Time: ' + averageMemoryAccessTime +
                    '\nTotal Memory Access Time: ' + totalMemoryAccessTime +
                    '\n\nCache Snapshot\n\n'+
                    '\tBlock \t\tAge \t\tData\n' + cacheSnapShotTxt;

        return text;
    }

    displayCache() {
        let table = document.getElementById('resultsTable');

        // Loop through the rows starting from the second row and remove them
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }

        // Loop through the cache and add each block to the table
        for (let i = 0; i < this.cache.length; i++) {
            addRow(i, this.ages[i], this.cache[i]);
        }
    }
    
}


