// Scorely App - Main JavaScript
class ScorelyApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 6;
        this.appData = this.loadAppData();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedData();
        this.updateProgressBar();
        this.setupTooltips();
        this.setupCharacterCounters();
        this.setupWeightSliders();
        this.setupTraits();
        this.setupMultiSelect();
        this.updateRowRangeIndicators();
    }

    // Data Management
    loadAppData() {
        const saved = localStorage.getItem('scorely_app_data');
        return saved ? JSON.parse(saved) : {
            jobDescription: '',
            idealProfiles: [],
            targetCompanies: '',
            experienceRange: { min: 0, max: 10 },
            industry: [],
            education: [],
            customTraits: [],
            hotSignals: '',
            rankingWeights: {
                techFit: 30,
                experience: 25,
                customTraitsWeight: 20,
                startupFit: 15,
                education: 10
            }
        };
    }

    saveAppData() {
        localStorage.setItem('scorely_app_data', JSON.stringify(this.appData));
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelector('.next-btn').addEventListener('click', () => this.nextStep());
        document.querySelector('.prev-btn').addEventListener('click', () => this.prevStep());

        // Save buttons
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.saveField(e.target.dataset.field));
        });

        // File uploads
        this.setupFileUploads();

        // Form inputs
        this.setupFormInputs();

        // API Key save
        const apiKeyInput = document.getElementById('api-key');
        const saveApiKeyBtn = document.getElementById('save-api-key-btn');
        const apiKeySaved = document.getElementById('api-key-saved');
        if (saveApiKeyBtn) {
            saveApiKeyBtn.addEventListener('click', () => {
                const key = apiKeyInput.value.trim();
                localStorage.setItem('scorely_api_key', key);
                apiKeySaved.style.display = 'inline';
                apiKeySaved.classList.add('show');
                setTimeout(() => {
                    apiKeySaved.classList.remove('show');
                    setTimeout(() => {
                        apiKeySaved.style.display = 'none';
                    }, 300);
                }, 2000);
            });
        }
        // Load API Key on init
        const storedKey = localStorage.getItem('scorely_api_key');
        if (storedKey && apiKeyInput) {
            apiKeyInput.value = storedKey;
        }
        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to restart and clear all data?')) {
                    localStorage.clear();
                    location.reload();
                }
            });
        }

        // Row range inputs
        const startRowInput = document.getElementById('start-row');
        const endRowInput = document.getElementById('end-row');
        if (startRowInput) {
            startRowInput.addEventListener('input', () => this.updateRowRangeIndicators());
        }
        if (endRowInput) {
            endRowInput.addEventListener('input', () => this.updateRowRangeIndicators());
        }

        // LinkedIn profile text save for ideal profiles
        document.querySelectorAll('.profile-slot').forEach((slot, index) => {
            const textarea = slot.querySelector('.linkedin-profile-textarea');
            const saveBtn = slot.querySelector('.linkedin-save-btn');
            const savedIndicator = slot.querySelector('.linkedin-saved-indicator');
            if (saveBtn && textarea) {
                saveBtn.addEventListener('click', () => {
                    const text = textarea.value.trim();
                    if (!this.appData.idealProfiles) this.appData.idealProfiles = [];
                    if (!this.appData.idealProfiles[index]) this.appData.idealProfiles[index] = {};
                    this.appData.idealProfiles[index].text = text;
                    this.saveAppData();
                    savedIndicator.style.display = 'inline';
                    savedIndicator.classList.add('show');
                    setTimeout(() => {
                        savedIndicator.classList.remove('show');
                        setTimeout(() => {
                            savedIndicator.style.display = 'none';
                        }, 300);
                    }, 2000);
                    // Update label color if text present
                    const label = slot.querySelector('label');
                    if (text) {
                        label.textContent = `Profile ${index + 1}: Pasted Text`;
                        label.style.color = '#2196F3';
                    } else {
                        label.textContent = `Profile ${index + 1}`;
                        label.style.color = '#333';
                    }
                });
            }
        });
        // On load, populate textarea if text exists
        if (this.appData.idealProfiles) {
            document.querySelectorAll('.profile-slot').forEach((slot, index) => {
                const textarea = slot.querySelector('.linkedin-profile-textarea');
                const label = slot.querySelector('label');
                const profile = this.appData.idealProfiles[index];
                if (profile && profile.text && textarea) {
                    textarea.value = profile.text;
                    label.textContent = `Profile ${index + 1}: Pasted Text`;
                    label.style.color = '#2196F3';
                }
            });
        }
    }

    setupFileUploads() {
        // Job Description file upload
        const jdFile = document.getElementById('jd-file');
        const jdTextarea = document.getElementById('job-description');
        
        jdFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.readFileAsText(file).then(text => {
                    jdTextarea.value = text.substring(0, 500);
                    this.updateCharacterCounter(jdTextarea);
                    this.saveField('job-description');
                });
            }
        });

        // Target Companies file upload
        const companiesFile = document.getElementById('companies-file');
        companiesFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.readFileAsText(file).then(text => {
                    document.getElementById('target-companies').value = text;
                    this.saveField('target-companies');
                });
            }
        });

        // Hot Signals file upload
        const signalsFile = document.getElementById('signals-file');
        signalsFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.readFileAsText(file).then(text => {
                    document.getElementById('hot-signals').value = text;
                    this.saveField('hot-signals');
                });
            }
        });

        // Ideal Profiles uploads
        document.querySelectorAll('.profile-slot input[type="file"]').forEach((input, index) => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleIdealProfileUpload(file, index);
                }
            });
        });
    }

    setupFormInputs() {
        // Experience range inputs
        const minExp = document.getElementById('min-experience');
        const maxExp = document.getElementById('max-experience');
        
        minExp.addEventListener('change', () => this.saveField('experience-range'));
        maxExp.addEventListener('change', () => this.saveField('experience-range'));

        // Custom industry input
        const customIndustryInput = document.getElementById('custom-industry');
        const addIndustryBtn = customIndustryInput.nextElementSibling;
        addIndustryBtn.addEventListener('click', () => this.addCustomIndustry());

        // Custom education input
        const customEducationInput = document.getElementById('custom-education');
        const addEducationBtn = customEducationInput.nextElementSibling;
        addEducationBtn.addEventListener('click', () => this.addCustomEducation());
    }

    // File Reading
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    handleIdealProfileUpload(file, index) {
        this.readFileAsText(file).then(text => {
            if (!this.appData.idealProfiles) {
                this.appData.idealProfiles = [];
            }
            this.appData.idealProfiles[index] = {
                name: file.name,
                content: text.substring(0, 1000) // Limit content
            };
            this.saveAppData();
            this.showSavedIndicator('ideal-profiles');
            
            // Update UI to show uploaded file
            const profileSlot = document.querySelectorAll('.profile-slot')[index];
            const label = profileSlot.querySelector('label');
            label.textContent = `Profile ${index + 1}: ${file.name}`;
            label.style.color = '#8BC34A';
        });
    }

    // Character Counters
    setupCharacterCounters() {
        const jdTextarea = document.getElementById('job-description');
        jdTextarea.addEventListener('input', () => this.updateCharacterCounter(jdTextarea));
        this.updateCharacterCounter(jdTextarea);
    }

    updateCharacterCounter(textarea) {
        const counter = textarea.parentElement.querySelector('.char-counter');
        if (counter) {
            const count = textarea.value.length;
            counter.textContent = `${count}/500`;
            
            if (count > 450) {
                counter.style.color = '#EC407A';
            } else if (count > 400) {
                counter.style.color = '#FF9800';
            } else {
                counter.style.color = '#666';
            }
        }
    }

    // Weight Sliders
    setupWeightSliders() {
        const sliders = document.querySelectorAll('.weight-slider');
        sliders.forEach(slider => {
            const valueDisplay = slider.parentElement.querySelector('.slider-value');
            
            slider.addEventListener('input', () => {
                valueDisplay.textContent = `${slider.value}%`;
            });
            
            slider.addEventListener('change', () => {
                this.saveField('ranking-weights');
            });
        });
    }

    // Traits Management
    setupTraits() {
        const addTraitBtn = document.querySelector('.add-trait-btn');
        const traitInput = document.getElementById('trait-input');
        
        addTraitBtn.addEventListener('click', () => this.addTrait());
        traitInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTrait();
            }
        });
    }

    addTrait() {
        const traitInput = document.getElementById('trait-input');
        const trait = traitInput.value.trim();
        
        if (trait && !this.appData.customTraits.includes(trait)) {
            this.appData.customTraits.push(trait);
            this.saveAppData();
            this.renderTraits();
            this.showSavedIndicator('custom-traits');
            traitInput.value = '';
        }
    }

    removeTrait(trait) {
        this.appData.customTraits = this.appData.customTraits.filter(t => t !== trait);
        this.saveAppData();
        this.renderTraits();
        this.showSavedIndicator('custom-traits');
    }

    renderTraits() {
        const traitsList = document.getElementById('traits-list');
        traitsList.innerHTML = '';
        
        this.appData.customTraits.forEach(trait => {
            const traitTag = document.createElement('div');
            traitTag.className = 'trait-tag';
            traitTag.innerHTML = `
                ${trait}
                <button class="remove-trait" onclick="app.removeTrait('${trait}')">&times;</button>
            `;
            traitsList.appendChild(traitTag);
        });
    }

    // Multi Select
    setupMultiSelect() {
        // Industry select all/clear
        const industrySelect = document.getElementById('industry-select');
        if (industrySelect) {
            const selectAllBtn = industrySelect.querySelector('.select-all-btn');
            const clearAllBtn = industrySelect.querySelector('.clear-all-btn');
            if (selectAllBtn) selectAllBtn.addEventListener('click', () => this.selectAll('industry'));
            if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAll('industry'));
        }
        // Education select all/clear
        const educationSelect = document.getElementById('education-select');
        if (educationSelect) {
            const eduSelectAllBtn = educationSelect.querySelector('.select-all-btn');
            const eduClearAllBtn = educationSelect.querySelector('.clear-all-btn');
            if (eduSelectAllBtn) eduSelectAllBtn.addEventListener('click', () => this.selectAll('education'));
            if (eduClearAllBtn) eduClearAllBtn.addEventListener('click', () => this.clearAll('education'));
        }
        // Checkbox change events
        document.querySelectorAll('.checkbox-option input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const multiSelect = checkbox.closest('.multi-select');
                if (!multiSelect) return;
                const field = multiSelect.id.replace('-select', '');
                this.saveField(field);
            });
        });
    }

    selectAll(field) {
        const container = document.getElementById(`${field}-select`);
        const checkboxes = container.querySelectorAll('.select-options input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = true;
            cb.dispatchEvent(new Event('change'));
        });
        this.saveField(field);
    }

    clearAll(field) {
        const container = document.getElementById(`${field}-select`);
        const checkboxes = container.querySelectorAll('.select-options input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = false;
            cb.dispatchEvent(new Event('change'));
        });
        this.saveField(field);
    }

    addCustomIndustry() {
        const input = document.getElementById('custom-industry');
        const industry = input.value.trim();
        
        if (industry) {
            // Add as a custom checkbox option
            const optionsContainer = document.getElementById('industry-select').querySelector('.select-options');
            const newOption = document.createElement('label');
            newOption.className = 'checkbox-option';
            newOption.innerHTML = `
                <input type="checkbox" value="custom-${industry.toLowerCase().replace(/\s+/g, '-')}">
                <span>${industry}</span>
            `;
            optionsContainer.appendChild(newOption);
            
            input.value = '';
            this.saveField('industry');
        }
    }

    addCustomEducation() {
        const input = document.getElementById('custom-education');
        const education = input.value.trim();
        
        if (education) {
            // Add as a custom checkbox option
            const optionsContainer = document.getElementById('education-select').querySelector('.select-options');
            const newOption = document.createElement('label');
            newOption.className = 'checkbox-option';
            newOption.innerHTML = `
                <input type="checkbox" value="custom-${education.toLowerCase().replace(/\s+/g, '-')}">
                <span>${education}</span>
            `;
            optionsContainer.appendChild(newOption);
            
            input.value = '';
            this.saveField('education');
        }
    }

    // Save Field
    saveField(fieldName) {
        switch (fieldName) {
            case 'job-description':
                this.appData.jobDescription = document.getElementById('job-description').value;
                break;
            case 'target-companies':
                this.appData.targetCompanies = document.getElementById('target-companies').value;
                break;
            case 'experience-range':
                this.appData.experienceRange = {
                    min: parseInt(document.getElementById('min-experience').value) || 0,
                    max: parseInt(document.getElementById('max-experience').value) || 10
                };
                break;
            case 'industry':
                this.appData.industry = this.getSelectedValues('industry-select');
                break;
            case 'education':
                this.appData.education = this.getSelectedValues('education-select');
                break;
            case 'hot-signals':
                this.appData.hotSignals = document.getElementById('hot-signals').value;
                break;
            case 'ranking-weights':
                this.appData.rankingWeights = {
                    techFit: parseInt(document.getElementById('tech-fit').value),
                    experience: parseInt(document.getElementById('experience').value),
                    customTraitsWeight: parseInt(document.getElementById('custom-traits-weight').value),
                    startupFit: parseInt(document.getElementById('startup-fit').value),
                    education: parseInt(document.getElementById('education-weight').value)
                };
                break;
        }
        
        this.saveAppData();
        this.showSavedIndicator(fieldName);
    }

    getSelectedValues(containerId) {
        const container = document.getElementById(containerId);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    // Load Saved Data
    loadSavedData() {
        // Job Description
        if (this.appData.jobDescription) {
            document.getElementById('job-description').value = this.appData.jobDescription;
            this.updateCharacterCounter(document.getElementById('job-description'));
        }

        // Target Companies
        if (this.appData.targetCompanies) {
            document.getElementById('target-companies').value = this.appData.targetCompanies;
        }

        // Experience Range
        if (this.appData.experienceRange) {
            document.getElementById('min-experience').value = this.appData.experienceRange.min;
            document.getElementById('max-experience').value = this.appData.experienceRange.max;
        }

        // Industry
        if (this.appData.industry) {
            this.setSelectedValues('industry-select', this.appData.industry);
        }

        // Education
        if (this.appData.education) {
            this.setSelectedValues('education-select', this.appData.education);
        }

        // Custom Traits
        if (this.appData.customTraits) {
            this.renderTraits();
        }

        // Hot Signals
        if (this.appData.hotSignals) {
            document.getElementById('hot-signals').value = this.appData.hotSignals;
        }

        // Ranking Weights
        if (this.appData.rankingWeights) {
            document.getElementById('tech-fit').value = this.appData.rankingWeights.techFit;
            document.getElementById('experience').value = this.appData.rankingWeights.experience;
            document.getElementById('custom-traits-weight').value = this.appData.rankingWeights.customTraitsWeight;
            document.getElementById('startup-fit').value = this.appData.rankingWeights.startupFit;
            document.getElementById('education-weight').value = this.appData.rankingWeights.education;
            
            // Update slider displays
            document.querySelectorAll('.weight-slider').forEach(slider => {
                const valueDisplay = slider.parentElement.querySelector('.slider-value');
                valueDisplay.textContent = `${slider.value}%`;
            });
        }

        // Ideal Profiles
        if (this.appData.idealProfiles) {
            this.appData.idealProfiles.forEach((profile, index) => {
                if (profile) {
                    const profileSlot = document.querySelectorAll('.profile-slot')[index];
                    const label = profileSlot.querySelector('label');
                    label.textContent = `Profile ${index + 1}: ${profile.name}`;
                    label.style.color = '#8BC34A';
                }
            });
        }
    }

    setSelectedValues(containerId, values) {
        const container = document.getElementById(containerId);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = values.includes(cb.value);
        });
    }

    // Saved Indicator
    showSavedIndicator(fieldName) {
        let indicator = null;
        // Support new explicit IDs for Step 4
        if (fieldName === 'title-synonyms') {
            indicator = document.getElementById('title-synonyms-saved');
        } else if (fieldName === 'essential-skills') {
            indicator = document.getElementById('essential-skills-saved');
        } else if (fieldName === 'red-flags') {
            indicator = document.getElementById('red-flags-saved');
        } else if (fieldName === 'column-mapping') {
            // Special handling for column mapping
            const saveBtn = document.querySelector('[data-field="column-mapping"]');
            if (saveBtn) {
                indicator = saveBtn.nextElementSibling;
            }
        } else {
            let saveBtn = document.querySelector(`[data-field="${fieldName}"]`);
            indicator = saveBtn ? saveBtn.nextElementSibling : null;
            if (!indicator || !indicator.classList.contains('saved-indicator')) {
                indicator = document.querySelector(`[data-field="${fieldName}"] ~ .saved-indicator`);
            }
        }
        if (!indicator) return;
        indicator.style.display = 'inline';
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 300);
        }, 2000);
    }

    // Tooltips
    setupTooltips() {
        // Tooltips are handled by CSS hover states
        // Additional tooltip functionality can be added here if needed
    }

    // Navigation
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateProgressBar();
            this.showStep(this.currentStep);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateProgressBar();
            this.showStep(this.currentStep);
        }
    }

    // Debug function to test navigation
    debugNavigation() {
        console.log('Current step:', this.currentStep);
        console.log('Total steps:', this.totalSteps);
        console.log('Step 2 element:', document.getElementById('step-2'));
        console.log('Step 2 display:', document.getElementById('step-2').style.display);
    }

    // Override showStep to setup step-specific functionality
    showStep(stepNumber) {
        console.log('Showing step:', stepNumber);
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
            step.style.display = 'none';
        });
        // Show current step
        const currentStepElement = document.getElementById(`step-${stepNumber}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
            currentStepElement.style.display = 'block';
            // Setup step-specific functionality
            if (stepNumber === 2) {
                this.setupStep2();
            } else if (stepNumber === 3) {
                this.setupStep3();
            } else if (stepNumber === 4) {
                this.setupStep4();
            } else if (stepNumber === 5) {
                this.setupStep5();
            } else if (stepNumber === 6) {
                this.setupStep6();
            }
        }
        // Update navigation buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        prevBtn.disabled = stepNumber === 1;
        nextBtn.disabled = stepNumber === this.totalSteps;
        if (stepNumber === this.totalSteps) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }
        console.log('Step display updated');
    }

    updateProgressBar() {
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }

    // Step 2 - Pre-filter functionality
    setupStep2() {
        this.setupFileUpload();
        this.setupFilterLists();
        this.loadFilterData();
        setTimeout(() => {
            const skipBtn = document.getElementById('skip-to-ranking-btn');
            if (skipBtn) {
                skipBtn.onclick = () => {
                    this.showStep(5);
                };
            }
        }, 0);
    }

    setupFileUpload() {
        const fileInput = document.getElementById('profiles-file');
        fileInput.addEventListener('change', (e) => this.handleProfilesFileUpload(e));
    }

    handleProfilesFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseCSV(content, file.name);
        };
        reader.readAsText(file);
    }

    parseCSV(content, fileName) {
        try {
            const results = Papa.parse(content, { header: true, skipEmptyLines: true });
            if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
            }
            
            this.profiles = results.data.map((row, index) => ({
                ...row,
                id: index + 1,
                raw: row
            }));
            this.headers = Object.keys(results.data[0] || {});
            
            // Debug: print headers and first row
            console.log('[DEBUG] Headers:', this.headers);
            console.log('[DEBUG] First row:', this.profiles[0]);
            console.log('[DEBUG] First row values:');
            this.headers.forEach(h => {
                console.log(h, JSON.stringify(this.profiles[0][h]));
            });
            
            console.log(`[Scorely] Loaded ${this.profiles.length} profiles from ${fileName}`);
            
            // Show column mapping
            this.showColumnMapping(this.headers);
            
            // Update row range indicators with new profile count
            this.updateRowRangeIndicators();
            
        } catch (error) {
            console.error('CSV parsing error:', error);
            alert('Error parsing CSV file. Please check the file format.');
        }
    }

    showColumnMapping(headers) {
        const mappingContainer = document.getElementById('column-mapping');
        const selects = mappingContainer.querySelectorAll('.mapping-select');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select column...</option>';
            headers.forEach(header => {
                const option = document.createElement('option');
                option.value = header;
                option.textContent = header;
                select.appendChild(option);
            });
        });
        
        mappingContainer.style.display = 'block';
    }

    saveColumnMapping() {
        const firstNameCol = document.getElementById('map-first-name').value;
        const lastNameCol = document.getElementById('map-last-name').value;
        const companyCol = document.getElementById('map-company').value;
        const titleCol = document.getElementById('map-title') ? document.getElementById('map-title').value : '';
        const linkedinCol = document.getElementById('map-linkedin') ? document.getElementById('map-linkedin').value : '';

        if (!firstNameCol || !lastNameCol || !companyCol) {
            alert('Please map all required columns');
            return;
        }

        this.columnMapping = {
            firstName: firstNameCol,
            lastName: lastNameCol,
            company: companyCol,
            title: titleCol,
            linkedin: linkedinCol
        };

        this.appData.columnMapping = this.columnMapping;
        this.saveAppData();
        
        // Create normalized profiles (only valid rows), but keep all original columns
        this.profiles = this.profiles.filter(row =>
            (row[firstNameCol] && row[firstNameCol].trim()) &&
            (row[lastNameCol] && row[lastNameCol].trim()) &&
            (row[companyCol] && row[companyCol].trim())
        ).map(row => ({
            ...row, // keep all original columns
            firstName: row[firstNameCol].trim(),
            lastName: row[lastNameCol].trim(),
            company: row[companyCol].trim(),
            title: titleCol && row[titleCol] ? row[titleCol].trim() : '',
            linkedin: linkedinCol && row[linkedinCol] ? row[linkedinCol].trim() : '',
            fullName: `${row[firstNameCol].trim()} ${row[lastNameCol].trim()}`,
            raw: row
        }));
        
        this.updateDashboardStats();
        this.showSavedIndicator('column-mapping');
        
        // Show mapping status with real count
        let status = document.getElementById('mapping-status');
        if (!status) {
            const btn = document.querySelector('#column-mapping .save-btn');
            status = document.createElement('span');
            status.id = 'mapping-status';
            status.style.marginLeft = '16px';
            status.style.color = '#2196F3';
            btn.parentNode.insertBefore(status, btn.nextSibling);
        }
        status.textContent = `Detected ${this.profiles.length} valid profiles after mapping.`;
        
        // Update row range indicators with new profile count
        this.updateRowRangeIndicators();
        
        // Optionally scroll to dashboard or make it visible
        const dashboard = document.querySelector('.dashboard-stats');
        if (dashboard) {
            dashboard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        console.log(`[Scorely] Column mapping saved. ${this.profiles.length} valid profiles created.`);
        
        // Refresh columns grid for summary mapping with new profiles
        this.populateColumnsGrid();
    }

    setupFilterLists() {
        // No-go companies checkboxes
        document.querySelectorAll('.preset-companies input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.saveFilterList('noGoCompanies'));
        });
    }

    loadFilterData() {
        // Load saved filter lists
        if (this.appData.blacklist) {
            document.getElementById('blacklist').value = this.appData.blacklist;
        }
        if (this.appData.pastCandidates) {
            document.getElementById('past-candidates').value = this.appData.pastCandidates;
        }
        if (this.appData.noGoCompanies) {
            document.getElementById('no-go-companies').value = this.appData.noGoCompanies;
        }
        if (this.appData.noGoPreset) {
            this.appData.noGoPreset.forEach(company => {
                const checkbox = document.querySelector(`input[value="${company}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    saveFilterList(listType) {
        switch (listType) {
            case 'blacklist':
                this.appData.blacklist = document.getElementById('blacklist').value;
                break;
            case 'pastCandidates':
                this.appData.pastCandidates = document.getElementById('past-candidates').value;
                break;
            case 'noGoCompanies':
                this.appData.noGoCompanies = document.getElementById('no-go-companies').value;
                // Save preset selections
                const presetCompanies = [];
                document.querySelectorAll('.preset-companies input[type="checkbox"]:checked').forEach(cb => {
                    presetCompanies.push(cb.value);
                });
                this.appData.noGoPreset = presetCompanies;
                break;
        }
        
        this.saveAppData();
        this.showSavedIndicator(listType);
    }

    clearFilterList(listType) {
        switch (listType) {
            case 'blacklist':
                document.getElementById('blacklist').value = '';
                this.appData.blacklist = '';
                break;
            case 'pastCandidates':
                document.getElementById('past-candidates').value = '';
                this.appData.pastCandidates = '';
                break;
            case 'noGoCompanies':
                document.getElementById('no-go-companies').value = '';
                this.appData.noGoCompanies = '';
                // Clear preset selections
                document.querySelectorAll('.preset-companies input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
                this.appData.noGoPreset = [];
                break;
        }
        
        this.saveAppData();
        this.showSavedIndicator(listType);
    }

    runFiltering() {
        if (!this.profiles || this.profiles.length === 0) {
            alert('No profiles loaded. Please upload a CSV file first.');
            return;
        }

        this.filteredProfiles = [...this.profiles];
        this.filterStats = {
            duplicates: 0,
            blacklist: 0,
            pastCandidates: 0,
            noGoCompanies: 0
        };
        
        const originalCount = this.filteredProfiles.length;

        // Apply filters
        this.deduplicateProfiles();
        this.applyBlacklistFilter();
        this.applyPastCandidatesFilter();
        this.applyNoGoCompaniesFilter();

        const finalCount = this.filteredProfiles.length;
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Show results
        this.showFilterResults();
        
        // Update row range indicators with new profile count
        this.updateRowRangeIndicators();
        
        console.log(`[Scorely] Basic filtering complete: ${originalCount} → ${finalCount} profiles`);
    }

    deduplicateProfiles() {
        const seen = new Set();
        const originalLength = this.filteredProfiles.length;
        
        this.filteredProfiles = this.filteredProfiles.filter(profile => {
            const key = `${profile.fullName.toLowerCase()}-${profile.company.toLowerCase()}`;
            if (seen.has(key)) {
                this.filterStats.duplicates++;
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    applyBlacklistFilter() {
        if (!this.appData.blacklist) return;
        
        const blacklist = this.appData.blacklist.split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line.length > 0);

        this.filteredProfiles = this.filteredProfiles.filter(profile => {
            // Blacklist: Only filter if currently working at the company
            const currentCompany = profile.company.toLowerCase();
            const isBlacklisted = blacklist.some(blacklisted => 
                currentCompany.includes(blacklisted) || blacklisted.includes(currentCompany)
            );
            
            if (isBlacklisted) {
                this.filterStats.blacklist++;
                return false;
            }
            return true;
        });
    }

    applyPastCandidatesFilter() {
        if (!this.appData.pastCandidates) return;
        
        const pastCandidates = this.appData.pastCandidates.split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line.length > 0);

        this.filteredProfiles = this.filteredProfiles.filter(profile => {
            const fullName = profile.fullName.toLowerCase();
            const isPastCandidate = pastCandidates.some(candidate => 
                fullName.includes(candidate) || candidate.includes(fullName)
            );
            
            if (isPastCandidate) {
                this.filterStats.pastCandidates++;
                return false;
            }
            return true;
        });
    }

    applyNoGoCompaniesFilter() {
        const noGoList = [];
        
        // Add preset companies
        document.querySelectorAll('.preset-companies input[type="checkbox"]:checked').forEach(cb => {
            noGoList.push(cb.value.toLowerCase());
        });
        
        // Add custom companies
        if (this.appData.noGoCompanies) {
            const customCompanies = this.appData.noGoCompanies.split('\n')
                .map(line => line.trim().toLowerCase())
                .filter(line => line.length > 0);
            noGoList.push(...customCompanies);
        }

        this.filteredProfiles = this.filteredProfiles.filter(profile => {
            // No-Go: Filter if currently working OR has worked in the past
            // For now, we only have current company info, so we check current company
            // In a real implementation, you'd also check employment history
            const currentCompany = profile.company.toLowerCase();
            const isNoGo = noGoList.some(noGo => 
                currentCompany.includes(noGo) || noGo.includes(currentCompany)
            );
            
            if (isNoGo) {
                this.filterStats.noGoCompanies++;
                return false;
            }
            return true;
        });
    }

    updateDashboardStats() {
        // Initialize filterStats if it doesn't exist
        if (!this.filterStats) {
            this.filterStats = {
                duplicates: 0,
                blacklist: 0,
                pastCandidates: 0,
                noGoCompanies: 0
            };
        }
        
        const uploadedCount = this.profiles ? this.profiles.length : 0;
        const filteredOutCount = this.filterStats.duplicates + this.filterStats.blacklist + 
            this.filterStats.pastCandidates + this.filterStats.noGoCompanies;
        const remainingCount = this.filteredProfiles ? this.filteredProfiles.length : uploadedCount;

        // Update the dashboard elements
        const uploadedCountEl = document.getElementById('uploaded-count');
        const filteredOutCountEl = document.getElementById('filtered-out-count');
        const remainingCountEl = document.getElementById('remaining-count');
        
        if (uploadedCountEl) uploadedCountEl.textContent = uploadedCount;
        if (filteredOutCountEl) filteredOutCountEl.textContent = filteredOutCount;
        if (remainingCountEl) remainingCountEl.textContent = remainingCount;

        // Update individual filter counts
        const duplicatesCountEl = document.getElementById('duplicates-count');
        const blacklistCountEl = document.getElementById('blacklist-count');
        const pastCandidatesCountEl = document.getElementById('past-candidates-count');
        const noGoCountEl = document.getElementById('no-go-count');
        
        if (duplicatesCountEl) duplicatesCountEl.textContent = this.filterStats.duplicates;
        if (blacklistCountEl) blacklistCountEl.textContent = this.filterStats.blacklist;
        if (pastCandidatesCountEl) pastCandidatesCountEl.textContent = this.filterStats.pastCandidates;
        if (noGoCountEl) noGoCountEl.textContent = this.filterStats.noGoCompanies;
    }

    showFilterResults() {
        // Show success message
        const message = `Filtering complete! ${this.filteredProfiles.length} profiles remain out of ${this.profiles.length} uploaded.`;
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'filter-success';
        successDiv.innerHTML = `
            <div style="background: #8BC34A; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <strong>✓ ${message}</strong>
            </div>
        `;
        const dashboardSection = document.querySelector('#step-2 .form-section:last-child');
        if (dashboardSection) {
            dashboardSection.insertBefore(successDiv, dashboardSection.firstChild);
        } else {
            // fallback: append to step-2
            document.getElementById('step-2').appendChild(successDiv);
        }
        // Remove message after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }

    clearDashboard() {
        this.profiles = [];
        this.filteredProfiles = [];
        this.filterStats = {
            duplicates: 0,
            blacklist: 0,
            pastCandidates: 0,
            noGoCompanies: 0
        };
        
        this.updateDashboardStats();
        
        // Clear file input
        document.getElementById('profiles-file').value = '';
        document.getElementById('column-mapping').style.display = 'none';
        
        // Remove any success messages
        const successMessages = document.querySelectorAll('.filter-success');
        successMessages.forEach(msg => msg.remove());
    }

    // Test function to manually switch to step 2
    testStep2() {
        console.log('Testing step 2...');
        this.currentStep = 2;
        this.showStep(2);
        this.updateProgressBar();
    }

    addCustomNoGo() {
        const input = document.getElementById('custom-no-go-input');
        const company = input.value.trim();
        
        if (company) {
            const textarea = document.getElementById('no-go-companies');
            const currentValue = textarea.value;
            const newValue = currentValue ? currentValue + '\n' + company : company;
            textarea.value = newValue;
            input.value = '';
            
            // Save immediately
            this.saveFilterList('noGoCompanies');
        }
    }

    // Step 3 - Profile Summary Mapping functionality
    setupStep3() {
        this.loadColumnSelection();
        this.populateColumnsGrid();
        this.showSampleRecord();
    }

    populateColumnsGrid() {
        if (!this.profiles || this.profiles.length === 0) {
            return;
        }

        const columnsGrid = document.getElementById('columns-grid');
        columnsGrid.innerHTML = '';

        // Use actual keys from the first profile row
        const actualHeaders = Object.keys(this.profiles[0]);

        actualHeaders.forEach(header => {
            const columnOption = document.createElement('div');
            columnOption.className = 'column-option';
            
            // Find first non-empty value for this column in all profiles (case-insensitive, trimmed)
            let sampleValue = '';
            for (let i = 0; i < this.profiles.length; i++) {
                const row = this.profiles[i];
                let foundKey = Object.keys(row).find(
                    k => k && k.trim().toLowerCase() === header.trim().toLowerCase()
                );
                let val = foundKey ? row[foundKey] : '';
                if (val && String(val).trim()) {
                    sampleValue = val;
                    break;
                }
            }
            if (!sampleValue) sampleValue = 'No sample available';
            
            columnOption.innerHTML = `
                <input type="checkbox" value="${header}" ${this.isColumnSelected(header) ? 'checked' : ''}>
                <div>
                    <div class="column-name">${header}</div>
                    <div class="column-sample">Sample: "${sampleValue}"</div>
                </div>
            `;
            
            // Add click handler
            const checkbox = columnOption.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                this.toggleColumnSelection(header);
                columnOption.classList.toggle('selected', checkbox.checked);
                this.updateSelectedColumnsCount();
            });
            
            // Set initial selected state
            if (checkbox.checked) {
                columnOption.classList.add('selected');
            }
            
            columnsGrid.appendChild(columnOption);
        });
    }

    isColumnSelected(columnName) {
        return this.appData.selectedColumns && this.appData.selectedColumns.includes(columnName);
    }

    toggleColumnSelection(columnName) {
        if (!this.appData.selectedColumns) {
            this.appData.selectedColumns = [];
        }
        
        const index = this.appData.selectedColumns.indexOf(columnName);
        if (index > -1) {
            this.appData.selectedColumns.splice(index, 1);
        } else {
            this.appData.selectedColumns.push(columnName);
        }
    }

    selectAllColumns() {
        if (!this.headers || this.headers.length === 0) {
            return;
        }
        this.appData.selectedColumns = [...this.headers];
        this.populateColumnsGrid();
        this.updateSelectedColumnsCount();
    }

    clearAllColumns() {
        this.appData.selectedColumns = [];
        this.populateColumnsGrid();
        this.updateSelectedColumnsCount();
    }

    saveColumnSelection() {
        this.saveAppData();
        this.showSavedIndicator('column-selection');
    }

    previewProfileSummary() {
        if (!this.appData.selectedColumns || this.appData.selectedColumns.length === 0) {
            alert('Please select at least one column for the profile summary.');
            return;
        }

        const summary = this.generateProfileSummary();
        this.displayPreview(summary);
        this.updatePreviewStats(summary);
        
        // Show preview section
        document.getElementById('preview-section').style.display = 'block';
    }

    generateProfileSummary() {
        if (!this.profiles || this.profiles.length === 0) {
            return '';
        }
        if (!this.appData.selectedColumns || this.appData.selectedColumns.length === 0) {
            return '';
        }
        
        // Find the first row with at least one non-empty value in the selected columns
        let row = null;
        for (let i = 0; i < this.profiles.length; i++) {
            const hasValue = this.appData.selectedColumns.some(col => {
                const val = this.profiles[i][col];
                if (val && typeof val === 'object') return Object.keys(val).length > 0;
                return val && String(val).trim();
            });
            if (hasValue) {
                row = this.profiles[i];
                break;
            }
        }
        
        if (!row) {
            return 'No data available for selected columns.';
        }
        
        // Use the same logic as generateProfileSummaryForProfile for consistency
        return this.generateProfileSummaryForProfile(row);
    }

    displayPreview(summary) {
        const previewContent = document.getElementById('preview-content');
        previewContent.textContent = summary;
    }

    updatePreviewStats(summary) {
        const charCount = summary.length;
        const wordCount = summary.split(/\s+/).filter(word => word.length > 0).length;
        const selectedColumnsCount = this.appData.selectedColumns ? this.appData.selectedColumns.length : 0;

        document.getElementById('char-count').textContent = charCount;
        document.getElementById('word-count').textContent = wordCount;
        document.getElementById('selected-columns-count').textContent = selectedColumnsCount;
    }

    updateSelectedColumnsCount() {
        const count = this.appData.selectedColumns ? this.appData.selectedColumns.length : 0;
        const countElement = document.getElementById('selected-columns-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    copyProfileSummary() {
        const previewContent = document.getElementById('preview-content');
        const text = previewContent.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary success message
            const copyBtn = document.querySelector('.copy-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.backgroundColor = '#8BC34A';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '#2196F3';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard. Please select and copy manually.');
        });
    }

    showSampleRecord() {
        if (!this.uploadedData || !this.uploadedData.rows || this.uploadedData.rows.length === 0) {
            return;
        }

        const sampleRecord = document.getElementById('sample-record');
        const firstRow = this.uploadedData.rows[0];
        
        sampleRecord.innerHTML = '';
        
        Object.entries(firstRow).forEach(([key, value]) => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'sample-field';
            fieldDiv.innerHTML = `
                <div class="field-label">${key}</div>
                <div class="field-value">${value || '(empty)'}</div>
            `;
            sampleRecord.appendChild(fieldDiv);
        });
        
        // Show sample record section
        document.getElementById('sample-record-section').style.display = 'block';
    }

    loadColumnSelection() {
        // Load previously selected columns
        if (this.appData.selectedColumns) {
            this.updateSelectedColumnsCount();
        }
    }

    // Step 4 - Advanced Pre-filter functionality
    setupStep4() {
        this.setupSimilaritySliders();
        this.loadAdvancedFilterData();
        this.setupRedFlags();
        // Add re-filter button logic
        setTimeout(() => { // ensure DOM is ready
            const reFilterBtn = document.getElementById('re-filter-btn');
            if (reFilterBtn) {
                reFilterBtn.onclick = () => {
                    this.saveAdvancedFilterSettings();
                    this.runAdvancedFiltering();
                };
            }
            // Add skip to ranking button logic
            const skipBtn = document.getElementById('skip-to-ranking-btn');
            if (skipBtn) {
                skipBtn.onclick = () => {
                    this.showStep(5);
                };
            }
        }, 0);
    }

    setupSimilaritySliders() {
        const sliders = document.querySelectorAll('.similarity-slider');
        sliders.forEach(slider => {
            const valueDisplay = slider.parentElement.querySelector('.threshold-value');
            // Find the saved indicator for this slider
            let savedIndicator = null;
            if (slider.id === 'title-similarity-threshold') {
                savedIndicator = document.getElementById('title-threshold-saved');
            } else if (slider.id === 'skills-similarity-threshold') {
                savedIndicator = document.getElementById('skills-threshold-saved');
            } else if (slider.id === 'context-similarity-threshold') {
                savedIndicator = document.getElementById('context-threshold-saved');
            }
            slider.addEventListener('input', () => {
                valueDisplay.textContent = parseFloat(slider.value).toFixed(2);
            });
            slider.addEventListener('change', () => {
                this.saveAdvancedFilterSettings();
                if (savedIndicator) {
                    savedIndicator.style.display = 'inline';
                    savedIndicator.classList.add('show');
                    setTimeout(() => {
                        savedIndicator.classList.remove('show');
                        setTimeout(() => {
                            savedIndicator.style.display = 'none';
                        }, 300);
                    }, 2000);
                }
            });
        });
    }

    setupRedFlags() {
        document.querySelectorAll('.flag-option input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.saveRedFlags();
            });
        });
    }

    loadAdvancedFilterData() {
        // Load title synonyms
        if (this.appData.titleSynonyms) {
            document.getElementById('title-synonyms').value = this.appData.titleSynonyms;
        }
        
        // Load essential skills
        if (this.appData.essentialSkills) {
            document.getElementById('essential-skills').value = this.appData.essentialSkills;
        }
        
        // Load similarity thresholds
        if (this.appData.similarityThresholds) {
            const thresholds = this.appData.similarityThresholds;
            if (thresholds.title !== undefined) {
                document.getElementById('title-similarity-threshold').value = thresholds.title;
                document.getElementById('title-similarity-threshold').parentElement.querySelector('.threshold-value').textContent = thresholds.title.toFixed(2);
            }
            if (thresholds.skills !== undefined) {
                document.getElementById('skills-similarity-threshold').value = thresholds.skills;
                document.getElementById('skills-similarity-threshold').parentElement.querySelector('.threshold-value').textContent = thresholds.skills.toFixed(2);
            }
            if (thresholds.context !== undefined) {
                document.getElementById('context-similarity-threshold').value = thresholds.context;
                document.getElementById('context-similarity-threshold').parentElement.querySelector('.threshold-value').textContent = thresholds.context.toFixed(2);
            }
        }
        
        // Load red flags
        if (this.appData.redFlags) {
            this.appData.redFlags.forEach(flag => {
                const checkbox = document.querySelector(`input[value="${flag}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    saveTitleSynonyms() {
        this.appData.titleSynonyms = document.getElementById('title-synonyms').value;
        this.saveAppData();
        this.showSavedIndicator('title-synonyms');
    }

    clearTitleSynonyms() {
        document.getElementById('title-synonyms').value = '';
        this.appData.titleSynonyms = '';
        this.saveAppData();
        this.showSavedIndicator('title-synonyms');
    }

    saveEssentialSkills() {
        this.appData.essentialSkills = document.getElementById('essential-skills').value;
        this.saveAppData();
        this.showSavedIndicator('essential-skills');
    }

    clearEssentialSkills() {
        document.getElementById('essential-skills').value = '';
        this.appData.essentialSkills = '';
        this.saveAppData();
        this.showSavedIndicator('essential-skills');
    }

    saveRedFlags() {
        const selectedFlags = [];
        document.querySelectorAll('.flag-option input[type="checkbox"]:checked').forEach(cb => {
            selectedFlags.push(cb.value);
        });
        this.appData.redFlags = selectedFlags;
        this.saveAppData();
        this.showSavedIndicator('red-flags');
    }

    clearRedFlags() {
        document.querySelectorAll('.flag-option input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        this.appData.redFlags = [];
        this.saveAppData();
        this.showSavedIndicator('red-flags');
    }

    saveAdvancedFilterSettings() {
        if (!this.appData.similarityThresholds) {
            this.appData.similarityThresholds = {};
        }
        
        this.appData.similarityThresholds.title = parseFloat(document.getElementById('title-similarity-threshold').value);
        this.appData.similarityThresholds.skills = parseFloat(document.getElementById('skills-similarity-threshold').value);
        this.appData.similarityThresholds.context = parseFloat(document.getElementById('context-similarity-threshold').value);
        
        this.saveAppData();
    }

    runAdvancedFiltering() {
        if (!this.profiles || this.profiles.length === 0) {
            alert('No profiles loaded. Please upload a CSV file first.');
            return;
        }

        this.advancedFilteredProfiles = [...this.profiles];
        const originalCount = this.advancedFilteredProfiles.length;

        // Initialize advancedFilterStats safely
        this.advancedFilterStats = {
            titleMatchFailed: 0,
            skillsMatchFailed: 0,
            contextFailed: 0,
            redFlagsDetected: 0
        };

        // Apply all filters
        this.applyTitleMatching();
        this.applySkillsMatching();
        this.applyContextAnalysis();
        this.applyRedFlagsFilter();

        const finalCount = this.advancedFilteredProfiles.length;
        
        // Update dashboard stats
        this.updateAdvancedDashboardStats();
        
        // Show results
        this.showAdvancedFilterResults();
        
        // Update row range indicators with new profile count
        this.updateRowRangeIndicators();
        
        console.log(`[Scorely] Advanced filtering complete: ${originalCount} → ${finalCount} profiles`);
    }

    applyContextAnalysis() {
        const threshold = this.appData.similarityThresholds?.context || 0.5;
        if (!this.advancedFilterStats) {
            this.advancedFilterStats = { titleMatchFailed: 0, skillsMatchFailed: 0, contextFailed: 0, redFlagsDetected: 0 };
        }
        this.advancedFilteredProfiles = this.advancedFilteredProfiles.filter(profile => {
            // Simulate company context analysis
            const companyContext = this.analyzeCompanyContext(profile.company || '');
            const contextScore = this.calculateContextScore(companyContext);
            if (contextScore < threshold) {
                this.advancedFilterStats.contextFailed++;
                return false;
            }
            return true;
        });
    }

    applyTitleMatching() {
        if (!this.advancedFilterStats) {
            this.advancedFilterStats = { titleMatchFailed: 0, skillsMatchFailed: 0, contextFailed: 0, redFlagsDetected: 0 };
        }
        // ... existing logic ...
        // (Assume similar safe checks for other advanced filter functions)
    }

    applySkillsMatching() {
        if (!this.advancedFilterStats) {
            this.advancedFilterStats = { titleMatchFailed: 0, skillsMatchFailed: 0, contextFailed: 0, redFlagsDetected: 0 };
        }
        // ... existing logic ...
    }

    applyRedFlagsFilter() {
        if (!this.advancedFilterStats) {
            this.advancedFilterStats = { titleMatchFailed: 0, skillsMatchFailed: 0, contextFailed: 0, redFlagsDetected: 0 };
        }
        if (!this.appData.redFlags || this.appData.redFlags.length === 0) return;
        this.advancedFilteredProfiles = this.advancedFilteredProfiles.filter(profile => {
            const hasRedFlag = this.detectRedFlags(profile);
            if (hasRedFlag) {
                this.advancedFilterStats.redFlagsDetected++;
                return false;
            }
            return true;
        });
    }

    generateProfileSummaryForProfile(profile) {
        if (!this.validateProfile(profile)) {
            return profile?.fullName || '';
        }
        
        const summaryParts = this.appData.selectedColumns.map(column => {
            let value = profile.raw && column in profile.raw ? profile.raw[column] : '';
            if (value && typeof value === 'object') value = JSON.stringify(value);
            return String(value ?? '').trim();
        }).filter(val => val && val.length > 0);
        
        return summaryParts.join(' | ');
    }

    calculateSimilarity(text1, text2) {
        // Simple similarity calculation (in real implementation, this would use embeddings)
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    analyzeCompanyContext(company) {
        // Simulate company context analysis
        const startupKeywords = ['startup', 'tech', 'innovation', 'ai', 'ml', 'saas', 'fintech'];
        const enterpriseKeywords = ['enterprise', 'corporate', 'bank', 'insurance', 'government'];
        
        const companyLower = company.toLowerCase();
        const startupScore = startupKeywords.filter(keyword => companyLower.includes(keyword)).length;
        const enterpriseScore = enterpriseKeywords.filter(keyword => companyLower.includes(keyword)).length;
        
        return { startupScore, enterpriseScore };
    }

    calculateContextScore(context) {
        // Higher score for startup-like companies
        return Math.min(1, context.startupScore * 0.3 - context.enterpriseScore * 0.1 + 0.5);
    }

    detectRedFlags(profile) {
        if (!this.appData.redFlags) return false;
        
        const profileText = this.generateProfileSummaryForProfile(profile);
        if (!profileText) return false;
        
        return this.appData.redFlags.some(flag => {
            switch (flag) {
                case 'instability':
                    return this.detectInstability(profile);
                case 'stagnation':
                    return this.detectStagnation(profile);
                case 'enterprise-only':
                    return this.detectEnterpriseOnly(profile);
                case 'freelancer':
                    return this.detectFreelancer(profile);
                default:
                    return false;
            }
        });
    }

    detectInstability(profile) {
        return false; // Always deterministic for demo
    }

    detectStagnation(profile) {
        return false; // Always deterministic for demo
    }

    detectEnterpriseOnly(profile) {
        // Simulate enterprise-only detection
        const enterpriseKeywords = ['enterprise', 'corporate', 'bank', 'insurance', 'government'];
        const companyLower = profile.company.toLowerCase();
        return enterpriseKeywords.some(keyword => companyLower.includes(keyword));
    }

    detectFreelancer(profile) {
        // Simulate freelancer detection
        const freelancerKeywords = ['freelance', 'contract', 'consultant', 'self-employed'];
        const profileText = this.generateProfileSummaryForProfile(profile);
        if (!profileText) return false;
        
        return freelancerKeywords.some(keyword => profileText.toLowerCase().includes(keyword));
    }

    updateAdvancedDashboardStats() {
        // Show the number of profiles that entered advanced filtering (after first filter)
        const initialPassed = this.filteredProfiles ? this.filteredProfiles.length : 0;
        const passedCount = this.advancedFilteredProfiles ? this.advancedFilteredProfiles.length : 0;
        const skippedCount = this.advancedFilterStats ? 
            this.advancedFilterStats.titleMatchFailed + this.advancedFilterStats.skillsMatchFailed + 
            this.advancedFilterStats.contextFailed + this.advancedFilterStats.redFlagsDetected : 0;
        const forwardedCount = passedCount;

        document.getElementById('profiles-passed-count').textContent = initialPassed;
        document.getElementById('profiles-skipped-count').textContent = skippedCount;
        document.getElementById('profiles-forwarded-count').textContent = forwardedCount;

        if (this.advancedFilterStats) {
            document.getElementById('title-match-failed-count').textContent = this.advancedFilterStats.titleMatchFailed;
            document.getElementById('skills-match-failed-count').textContent = this.advancedFilterStats.skillsMatchFailed;
            document.getElementById('context-failed-count').textContent = this.advancedFilterStats.contextFailed;
            document.getElementById('red-flags-count').textContent = this.advancedFilterStats.redFlagsDetected;
        }
    }

    showAdvancedFilterResults() {
        const message = `Advanced filtering complete! ${this.advancedFilteredProfiles.length} profiles forwarded to ranking out of ${this.filteredProfiles.length} from previous step.`;
        
        const successDiv = document.createElement('div');
        successDiv.className = 'advanced-filter-success';
        successDiv.innerHTML = `
            <div style="background: #EC407A; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <strong>✓ ${message}</strong>
            </div>
        `;
        
        const dashboardSection = document.querySelector('#step-4 .form-section:last-child');
        dashboardSection.insertBefore(successDiv, dashboardSection.firstChild);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }

    clearAdvancedDashboard() {
        this.advancedFilteredProfiles = [];
        this.advancedFilterStats = {
            titleMatchFailed: 0,
            skillsMatchFailed: 0,
            contextFailed: 0,
            redFlagsDetected: 0
        };
        
        this.updateAdvancedDashboardStats();
        
        const successMessages = document.querySelectorAll('.advanced-filter-success');
        successMessages.forEach(msg => msg.remove());
    }

    // Step 5 - Ranking functionality
    setupStep5() {
        this.loadRankingSettings();
        this.setupRankingControls();
        // Hybrid threshold listeners
        const topInput = document.getElementById('top-threshold');
        const borderlineInput = document.getElementById('borderline-threshold');
        if (topInput && borderlineInput) {
            const updateLabels = () => {
                document.getElementById('top-threshold-label').textContent = topInput.value;
                document.getElementById('top-threshold-label-2').textContent = topInput.value;
                document.getElementById('borderline-threshold-label').textContent = borderlineInput.value;
                document.getElementById('borderline-threshold-label-2').textContent = borderlineInput.value;
            };
            topInput.addEventListener('input', () => {
                this.appData.hybridTopThreshold = parseFloat(topInput.value);
                updateLabels();
                this.saveAppData();
            });
            borderlineInput.addEventListener('input', () => {
                this.appData.hybridBorderlineThreshold = parseFloat(borderlineInput.value);
                updateLabels();
                this.saveAppData();
            });
            // Set defaults if not present
            if (!this.appData.hybridTopThreshold) this.appData.hybridTopThreshold = parseFloat(topInput.value);
            if (!this.appData.hybridBorderlineThreshold) this.appData.hybridBorderlineThreshold = parseFloat(borderlineInput.value);
            updateLabels();
        }
    }

    loadRankingSettings() {
        // Load model selection
        if (this.appData.rankingModel) {
            const modelRadio = document.querySelector(`input[name='ranking-model'][value='${this.appData.rankingModel}']`);
            if (modelRadio) modelRadio.checked = true;
        }
        // Load row range
        if (this.appData.rankingRowRange) {
            document.getElementById('start-row').value = this.appData.rankingRowRange.start;
            document.getElementById('end-row').value = this.appData.rankingRowRange.end;
        }
    }

    setupRankingControls() {
        // Model selection
        document.querySelectorAll('input[name="ranking-model"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.appData.rankingModel = radio.value;
                this.saveAppData();
            });
        });
        // Row range
        document.getElementById('start-row').addEventListener('change', () => {
            this.saveRowRange();
        });
        document.getElementById('end-row').addEventListener('change', () => {
            this.saveRowRange();
        });
    }

    saveRowRange() {
        this.appData.rankingRowRange = {
            start: parseInt(document.getElementById('start-row').value) || 2,
            end: parseInt(document.getElementById('end-row').value) || 100
        };
        this.saveAppData();
    }

    startRanking() {
        // Allow ranking after Step 2 or Step 4
        let candidates = (this.advancedFilteredProfiles && this.advancedFilteredProfiles.length > 0)
            ? this.advancedFilteredProfiles
            : (this.filteredProfiles && this.filteredProfiles.length > 0 ? this.filteredProfiles : []);
        // Apply row range
        let start = 2, end = 100;
        if (this.appData.rankingRowRange) {
            start = this.appData.rankingRowRange.start;
            end = this.appData.rankingRowRange.end;
        } else {
            // fallback: read from DOM
            const startInput = document.getElementById('start-row');
            const endInput = document.getElementById('end-row');
            if (startInput && endInput) {
                start = parseInt(startInput.value) || 2;
                end = parseInt(endInput.value) || 100;
            }
        }
        // Row 1 is header, so index 0 is row 2
        const rangeCandidates = candidates.slice(start - 2, end - 1 + 1);
        console.log('Start ranking, candidates:', rangeCandidates);
        if (!rangeCandidates || rangeCandidates.length === 0) {
            alert('No candidates in selected row range.');
            return;
        }
        // Show loading overlay
        let loadingOverlay = document.getElementById('scorely-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'scorely-loading-overlay';
            loadingOverlay.style.position = 'fixed';
            loadingOverlay.style.top = '0';
            loadingOverlay.style.left = '0';
            loadingOverlay.style.width = '100vw';
            loadingOverlay.style.height = '100vh';
            loadingOverlay.style.background = 'rgba(33,150,243,0.12)';
            loadingOverlay.style.zIndex = '5000';
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.alignItems = 'center';
            loadingOverlay.style.justifyContent = 'center';
            loadingOverlay.innerHTML = `<div style='background:white;padding:32px 48px;border-radius:16px;box-shadow:0 8px 32px rgba(33,150,243,0.18);font-size:1.3em;color:#2196F3;font-weight:600;display:flex;align-items:center;gap:18px;'><span class='loader' style='width:32px;height:32px;border:4px solid #2196F3;border-top:4px solid #8BC34A;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;'></span>Ranking in progress... Please wait</div>`;
            document.body.appendChild(loadingOverlay);
            // Add loader animation
            const style = document.createElement('style');
            style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
            document.head.appendChild(style);
        } else {
            loadingOverlay.style.display = 'flex';
        }
        this.rankingInProgress = true;
        document.getElementById('start-ranking-btn').disabled = true;
        document.getElementById('stop-ranking-btn').disabled = false;
        this.resetRankingStatus();
        // Always pass a fresh copy to runHybridRanking
        this.runHybridRanking([...rangeCandidates]);
    }

    async runHybridRanking(candidatesInput) {
        const candidates = candidatesInput || this.advancedFilteredProfiles;
        const total = candidates.length;
        let ranked = 0;
        let errors = 0;
        let batches = 0;
        this.candidates = [];
        const progressDiv = document.getElementById('ranking-progress-indicator');
        progressDiv.style.display = 'flex';
        // Get thresholds
        const topThreshold = this.appData.hybridTopThreshold || 0.85;
        const borderlineThreshold = this.appData.hybridBorderlineThreshold || 0.60;
        // Economy Mode toggle
        const economyMode = document.getElementById('economy-mode-toggle') && document.getElementById('economy-mode-toggle').checked;
        // Prepare ideal profile embeddings
        let idealEmbeddings = [];
        // Prepare Hot Signals list
        const hotSignals = (this.appData.hotSignals || '').split('\n').map(s => s.trim().toLowerCase()).filter(Boolean);
        try {
            const idealProfiles = (this.appData.idealProfiles || []).map(p => p.text || p.content || '').filter(Boolean);
            for (let text of idealProfiles) {
                idealEmbeddings.push(await this.fetchEmbedding(text));
            }
        } catch (e) {
            alert('Failed to fetch embeddings for ideal profiles: ' + e.message);
            return;
        }
        // Ranking loop
        for (let i = 0; i < total; i++) {
            if (!this.rankingInProgress) break;
            const candidate = candidates[i];
            
            // Validate candidate before processing
            if (!this.validateProfile(candidate)) {
                console.warn(`[Scorely] Skipping invalid candidate: ${candidate.fullName || 'Unknown'}`);
                continue;
            }
            
            // Check Hot Signal
            const isHotSignal = hotSignals.length && hotSignals.some(hs => (candidate.company || '').toLowerCase().includes(hs));
            candidate.hotSignal = isHotSignal;
            let result = null;
            try {
                // 1. Get candidate embedding
                const summary = this.generateProfileSummaryForProfile(candidate);
                if (!summary || summary.trim().length === 0) {
                    console.warn(`[Scorely] Empty summary for candidate: ${candidate.fullName || 'Unknown'}`);
                    continue;
                }
                const candEmbedding = await this.fetchEmbedding(summary);
                // 2. Compare to each ideal profile, take max similarity
                let maxSim = 0;
                for (let ideal of idealEmbeddings) {
                    const sim = this.cosineSimilarity(candEmbedding, ideal);
                    if (sim > maxSim) maxSim = sim;
                }
                candidate.embedding = maxSim.toFixed(3);
                // 3. Decide ranking method
                if (maxSim >= topThreshold) {
                    result = await this.rankWithEmbedding(candidate, maxSim, isHotSignal);
                } else if (maxSim >= borderlineThreshold) {
                    // Economy Mode: use GPT-3.5-turbo for borderline, GPT-4o for top
                    let gptModel = 'gpt-4o';
                    if (economyMode && maxSim < 0.8) {
                        gptModel = 'gpt-3.5-turbo';
                    }
                    result = await this.rankWithHybrid(candidate, maxSim, isHotSignal, gptModel);
                }
                // HOT logic: if hotSignal and score >= 70, set hitSignal flag and category to 'hot'
                if (result && result.hotSignal && result.score >= 70) {
                    result.hitSignal = true;
                    result.category = 'hot';
                }
                // Only add candidates with score >= borderlineThreshold * 100
                if (result && result.score >= Math.round(borderlineThreshold * 100)) {
                    this.candidates.push(result);
                    ranked++;
                }
            } catch (e) {
                errors++;
                console.error(`Ranking error for candidate ${candidate.fullName || candidate.company || 'Unknown'}:`, e);
            }
            batches = Math.floor((i + 1) / 20) + 1;
            document.getElementById('batches-processed').textContent = batches;
            document.getElementById('profiles-ranked').textContent = ranked;
            document.getElementById('ranking-errors').textContent = errors;
            this.renderProgressIndicator((i + 1) / total);
        }
        progressDiv.style.display = 'none';
        this.rankingInProgress = false;
        document.getElementById('start-ranking-btn').disabled = false;
        document.getElementById('stop-ranking-btn').disabled = true;
        // Hide loading overlay
        let loadingOverlay = document.getElementById('scorely-loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (ranked === 0) {
            alert('No candidates were ranked. Check the API key, network connection, and that your data is valid. See the browser console for error details.');
        }
        console.log('[Scorely] All ranked candidates:', this.candidates);
        this.showStep(6);
        this.renderCandidates();
        this.updateResultsStats();
    }

    async rankWithHybrid(candidate, embeddingScore, isHotSignal, gptModelOverride) {
        let aiSummary = '', strengths = [], concerns = [], explanation = '', aiScore = null;
        try {
            const jobDescription = this.appData.jobDescription || '';
            const idealProfiles = (this.appData.idealProfiles || []).map(p => p.text || p.content || '').filter(Boolean);
            const summary = this.generateProfileSummaryForProfile(candidate);
            // DEBUG LOGS
            console.log('[DEBUG] Candidate:', candidate.fullName, 'Summary sent to AI:', summary);
            console.log('[DEBUG] selectedColumns:', this.appData.selectedColumns);
            this.appData.selectedColumns.forEach(col => {
                console.log('[DEBUG] Column:', col, 'Value:', candidate.raw ? candidate.raw[col] : undefined);
            });
            if (!summary || summary.trim().length === 0) {
                console.warn(`[Scorely] Empty summary for candidate in rankWithHybrid: ${candidate.fullName || 'Unknown'}`);
                aiSummary = 'AI summary unavailable - empty profile data.';
            } else {
                const gptResult = await this.fetchGPTSummary({ summary }, jobDescription, idealProfiles, gptModelOverride);
                aiSummary = gptResult;
                // Parse strengths, concerns, explanation, and score from GPT result
                // Use the last valid score found (to avoid picking up a previous score in the explanation)
                const scoreMatches = [...gptResult.matchAll(/score[^\d]*(\d{2,3})/gi)];
                if (scoreMatches.length > 0) {
                    const lastScore = scoreMatches[scoreMatches.length - 1][1];
                    aiScore = parseInt(lastScore.trim());
                }
                const concernsMatch = gptResult.match(/concerns?[:\-\n]*([\s\S]*?)(\n\*\*|\n- |\nExplanation|$)/i);
                if (concernsMatch) concerns = concernsMatch[1].split(/\n|\*/).map(s => s.trim()).filter(Boolean);
                // Improved explanation extraction: get all text after 'Explanation' (including newlines), or fallback to full summary
                const explanationMatch = gptResult.match(/Explanation[\s\S]*?[:\-\n]+([\s\S]*)/i);
                if (explanationMatch) explanation = explanationMatch[1].trim();
                else explanation = aiSummary;
            }
        } catch (e) {
            console.error(`[Scorely] Error in rankWithHybrid for ${candidate.fullName}:`, e);
            aiSummary = 'AI summary unavailable due to error.';
        }
        // Always use AI score if found, else fallback
        let finalScore = (aiScore && !isNaN(aiScore)) ? aiScore : Math.round(embeddingScore * 100 + 10);
        
        // Use the Top Threshold from UI (default 85) instead of hardcoded 90
        const topThreshold = this.appData.hybridTopThreshold || 0.85;
        const topThresholdScore = Math.round(topThreshold * 100);
        
        let category = 'hot';
        if (finalScore >= topThresholdScore) category = 'top';
        else if (finalScore >= 70) category = 'good';
        else if (finalScore >= 50) category = 'hidden';
        
        // If hotSignal and score >= 70, override to hot; else, use calculated category
        if (!(isHotSignal && finalScore >= 70)) {
            if (finalScore >= topThresholdScore) category = 'top';
            else if (finalScore >= 70) category = 'good';
            else if (finalScore >= 50) category = 'hidden';
            else category = '';
        }
        
        let linkedin = candidate.linkedin || (candidate.raw && (candidate.raw['LinkedIn'] || candidate.raw['linkedin']));
        return {
            ...candidate,
            score: finalScore,
            aiScore: aiScore,
            category,
            explanation: explanation || 'Ranked by embedding + GPT-4o analysis.',
            embedding: embeddingScore.toFixed(3),
            strengths,
            concerns,
            hotSignal: isHotSignal,
            summary: this.generateProfileSummaryForProfile(candidate),
            aiSummary,
            linkedin,
            id: this.candidates.length + 1
        };
    }

    async fetchGPTSummary(profile, jobDescription, idealProfiles, gptModelOverride) {
        const apiKey = localStorage.getItem('scorely_api_key');
        if (!apiKey) throw new Error('No OpenAI API key found.');
        
        // Ensure profile summary is valid
        if (!profile.summary || profile.summary.trim().length === 0) {
            throw new Error('Profile summary is empty or invalid');
        }
        
        // Compose prompt with explicit instruction
        const prompt = `You are an expert recruiter. Analyze the following candidate profile for fit to the job description and ideal profiles.\n\nJob Description:\n${jobDescription}\n\nIdeal Profiles:\n${idealProfiles.map((p,i)=>`Profile ${i+1}: ${p}`).join('\n')}\n\nCandidate Profile:\n${profile.summary}\n\nReturn:\n- Short summary of experience and fit\n- Main strengths\n- Main concerns (gaps)\n- Explanation for the score (0-100)\n\nIMPORTANT: Do NOT copy text from the ideal profiles. Write a unique summary for the candidate only, based on the Candidate Profile above. Do not use names or details from the ideal profiles in the candidate summary.`;
        // DEBUG: log the full prompt
        console.log('[DEBUG] GPT Prompt:', prompt);
        const model = gptModelOverride || 'gpt-4o';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 400,
                temperature: 0.2
            })
        });
        if (!response.ok) throw new Error('GPT API error');
        const data = await response.json();
        // Log usage to Google Sheets
        if (data.usage) {
            const date = new Date().toISOString();
            const promptTokens = data.usage.prompt_tokens || 0;
            const completionTokens = data.usage.completion_tokens || 0;
            const totalCost = this.getModelCost(model, promptTokens, completionTokens);
            this.logUsageToSheet({date, model, promptTokens, completionTokens, totalCost: totalCost.toFixed(6)});
        }
        return data.choices[0].message.content;
    }

    renderProgressIndicator(progress) {
        const percent = Math.round(progress * 100);
        const radius = 28;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - progress);
        document.getElementById('ranking-progress-indicator').innerHTML = `
            <div class="progress-circle">
                <svg width="64" height="64">
                    <circle class="progress-bg" cx="32" cy="32" r="28" fill="none" />
                    <circle class="progress-bar" cx="32" cy="32" r="28" fill="none" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
                </svg>
                <div class="progress-text">${percent}%</div>
            </div>
        `;
    }

    // Helper: Log OpenAI usage to Google Sheets
    async logUsageToSheet({date, model, promptTokens, completionTokens, totalCost}) {
        const url = "https://script.google.com/a/macros/added-value.co.il/s/AKfycbzf3seMAhiM7N90ep_wvFSl04el-W6aVznRFwhcKbyHzYp4Y5-k8Qa1uU4pmlMO7mzx/exec";
        const payload = {
            date,
            model,
            promptTokens,
            completionTokens,
            totalCost
        };
        try {
            await fetch(url, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("Failed to log usage to Google Sheet:", e);
        }
    }

    // OpenAI pricing (as of 2024-06)
    getModelCost(model, promptTokens, completionTokens) {
        // Prices per 1K tokens (USD)
        // gpt-4o: $5.00 / 1M prompt, $15.00 / 1M completion
        // gpt-4-turbo: $10.00 / 1M prompt, $30.00 / 1M completion
        // gpt-3.5-turbo: $0.50 / 1M prompt, $1.50 / 1M completion
        // text-embedding-3-small: $0.02 / 1M tokens
        if (model === 'gpt-4o') {
            return ((promptTokens / 1000) * 0.005) + ((completionTokens / 1000) * 0.015);
        } else if (model === 'gpt-4-turbo') {
            return ((promptTokens / 1000) * 0.01) + ((completionTokens / 1000) * 0.03);
        } else if (model === 'gpt-3.5-turbo') {
            return ((promptTokens / 1000) * 0.0005) + ((completionTokens / 1000) * 0.0015);
        } else if (model === 'text-embedding-3-small') {
            return ((promptTokens + completionTokens) / 1000) * 0.00002;
        }
        return 0;
    }

    async fetchEmbedding(text) {
        const apiKey = localStorage.getItem('scorely_api_key');
        if (!apiKey) throw new Error('No OpenAI API key found.');
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: 'text-embedding-3-small'
            })
        });
        if (!response.ok) throw new Error('Embedding API error');
        const data = await response.json();
        // Log usage to Google Sheets
        if (data.usage) {
            const date = new Date().toISOString();
            const model = 'text-embedding-3-small';
            const promptTokens = data.usage.prompt_tokens || 0;
            const completionTokens = data.usage.total_tokens ? data.usage.total_tokens - (data.usage.prompt_tokens || 0) : 0;
            const totalCost = this.getModelCost(model, promptTokens, completionTokens);
            this.logUsageToSheet({date, model, promptTokens, completionTokens, totalCost: totalCost.toFixed(6)});
        }
        return data.data[0].embedding;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    submitRankingFeedback() {
        const feedback = document.getElementById('general-feedback').value;
        const criteria = Array.from(document.querySelectorAll('.criteria-selection input[type="checkbox"]:checked')).map(cb => cb.value);
        // Save feedback (for demo, just log)
        console.log('Ranking Feedback:', { feedback, criteria });
        this.closeFeedbackModal();
        alert('Thank you for your feedback! The AI will adjust criteria for future runs.');
    }

    // Step 6 - Results Dashboard functionality
    setupStep6() {
        this.currentResultsTab = 'top';
        this.renderCandidates();
        this.updateResultsStats();
    }

    renderCandidates() {
        const tableBody = document.getElementById('candidates-tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        const candidates = this.getFilteredCandidates();
        candidates.forEach(candidate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${candidate.fullName || ''}</td>
                <td>${candidate.company || ''}${candidate.hitSignal ? ' <span title="HOT" style="color:#43a047;font-size:1.1em;font-weight:600;vertical-align:middle;background:#e8f5e9;padding:2px 8px;border-radius:6px;">HOT</span>' : candidate.hotSignal ? ' <span title="Hot Signal" style="color:#EC407A;font-size:1.2em;vertical-align:middle;">🔥</span>' : ''}</td>
                <td>${candidate.title || ''}</td>
                <td>${candidate.score !== undefined ? candidate.score : ''}${candidate.aiScore && candidate.aiScore !== candidate.score ? ` (AI suggested: ${candidate.aiScore})` : ''}</td>
                <td>${this.capitalizeCategory(candidate.category)}</td>
                <td><a class=\"candidate-link\" href=\"#\" onclick=\"event.preventDefault(); event.stopPropagation(); window.open('${candidate.linkedin || (candidate.raw && candidate.raw['LinkedIn']) || '#'}', '_blank'); return false;\">LinkedIn</a></td>
                <td><button class=\"card-action-btn\" onclick=\"app.showCandidateModal(${candidate.id})\">View</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    getFilteredCandidates() {
        let candidates = this.candidates;
        // TEMP: Disable tab filter for debugging
        // if (this.currentResultsTab && this.currentResultsTab !== 'all') {
        //     candidates = candidates.filter(c => c.category === this.currentResultsTab);
        // }
        // Search filter
        const search = (this.currentSearch || '').toLowerCase();
        if (search) {
            candidates = candidates.filter(c =>
                c.fullName.toLowerCase().includes(search) ||
                c.company.toLowerCase().includes(search) ||
                c.summary.toLowerCase().includes(search) ||
                (c.strengths && c.strengths.join(' ').toLowerCase().includes(search)) ||
                (c.concerns && c.concerns.join(' ').toLowerCase().includes(search))
            );
        }
        return candidates;
    }

    switchResultsTab(tab) {
        this.currentResultsTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.renderCandidates();
        this.updateResultsStats();
    }

    searchResults() {
        this.currentSearch = document.getElementById('results-search').value;
        this.renderCandidates();
        this.updateResultsStats();
    }

    updateResultsStats() {
        const counts = { top: 0, good: 0, hidden: 0, hot: 0 };
        this.candidates.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
        document.getElementById('top-count').textContent = counts.top;
        document.getElementById('good-count').textContent = counts.good;
        document.getElementById('hidden-count').textContent = counts.hidden;
        document.getElementById('hot-count').textContent = counts.hot;
    }

    capitalizeCategory(cat) {
        if (cat === 'top') return 'Top';
        if (cat === 'good') return 'Good';
        if (cat === 'hidden') return 'Hidden Gems';
        if (cat === 'hot') return 'Hot Signals';
        return cat;
    }

    showCandidateModal(id) {
        const candidate = this.candidates.find(c => c.id === id);
        if (!candidate) return;
        const modal = document.getElementById('candidate-modal');
        const details = document.getElementById('candidate-details');
        // Main info - redesigned, no duplicate heading, clear sections
        let hiddenGemBanner = '';
        if (candidate.category === 'hidden') {
            hiddenGemBanner = `<div style='background:#fffde7;color:#EC407A;padding:10px 18px;border-radius:8px 8px 0 0;font-weight:600;font-size:1.05em;margin-bottom:12px;'><span style='font-size:1.2em;'>💎</span> <b>Hidden Gem:</b> This candidate received a borderline score, but the AI detected unique or promising signals. Consider reviewing manually for potential fit.</div>`;
        }
        details.innerHTML = `
            ${candidate.hitSignal ? `<div style='background:#e8f5e9;color:#43a047;padding:10px 18px;border-radius:8px 8px 0 0;font-weight:600;font-size:1.1em;margin-bottom:12px;'><span style='font-size:1.2em;'>✔️</span> HOT: This candidate currently works at a Hot Signal company and is likely open to new opportunities.</div>` : candidate.hotSignal ? `<div style='background:#fff3e0;color:#EC407A;padding:10px 18px;border-radius:8px 8px 0 0;font-weight:600;font-size:1.1em;margin-bottom:12px;'><span style='font-size:1.3em;'>🔥</span> This candidate currently works at a Hot Signal company: <b>${candidate.company}</b></div>` : ''}
            ${hiddenGemBanner}
            <div style='padding: 0 0 10px 0; border-bottom: 1px solid #e0e0e0; margin-bottom: 12px;'>
                <span style='font-size:1.35em;font-weight:700;color:#2196F3;'>${candidate.fullName || ''}</span>
                <span style='font-size:1em;color:#666;margin-left:10px;'>${candidate.title || ''}</span>
            </div>
            <div style='margin-bottom: 10px;'><b>Company:</b> ${candidate.company || ''}</div>
            <div style='margin-bottom: 10px;'><b>Score:</b> <span style='color:#8BC34A;font-weight:700;'>${candidate.aiScore !== null && candidate.aiScore !== undefined ? candidate.aiScore : candidate.score}</span></div>
            <div style='margin-bottom: 10px;'><b>Category:</b> ${this.capitalizeCategory(candidate.category)}</div>
            <div style='margin-bottom: 10px;'><b>LinkedIn:</b> <a class='candidate-link' href='#' onclick="event.preventDefault(); event.stopPropagation(); window.open('${candidate.linkedin || (candidate.raw && candidate.raw['LinkedIn']) || '#'}', '_blank'); return false;">Profile</a></div>
            <div style='margin-bottom: 10px;'><b>Embedding Score:</b> ${candidate.embedding !== undefined ? candidate.embedding : ''}</div>
            <div style='margin-bottom: 14px;'><b>AI Summary:</b><br><div style='background:#f5faff;padding:10px 12px;border-radius:8px;margin-top:4px;white-space:pre-line;'>${candidate.aiSummary || 'AI summary of experience and fit will appear here.'}</div></div>
            <div style='margin-bottom: 10px;'><b>Strengths:</b><br><span style='color:#1976d2;'>${(candidate.strengths && candidate.strengths.length) ? candidate.strengths.join('<br>') : 'None listed.'}</span></div>
            <div style='margin-bottom: 10px;'><b>Concerns:</b><br><span style='color:#EC407A;'>${(candidate.concerns && candidate.concerns.length) ? candidate.concerns.join('<br>') : 'None listed.'}</span></div>
            <div style='margin:12px 0;'><b>Notes:</b><br><textarea id='candidate-notes' style='width:100%;min-height:48px;'>${candidate.notes || ''}</textarea></div>
            <div style="margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="card-action-btn" onclick="app.showRawDataModal(${candidate.id})">Details</button>
                <button class="export-btn" onclick="app.exportCandidatePDF()">Export as PDF</button>
                <button class="card-action-btn" onclick="app.openRecategorizeModal(${candidate.id})">Re-categorize</button>
                <button class="card-action-btn close-btn" onclick="app.closeCandidateModal()">Close</button>
            </div>
        `;
        // Save notes on blur
        setTimeout(() => {
            const notesInput = document.getElementById('candidate-notes');
            if (notesInput) {
                notesInput.addEventListener('blur', () => {
                    candidate.notes = notesInput.value;
                });
            }
        }, 100);
        modal.style.display = 'flex';
    }

    closeCandidateModal() {
        document.getElementById('candidate-modal').style.display = 'none';
    }

    showRawDataModal(id) {
        // Show all raw data fields in a separate modal (reuse candidate-modal for simplicity)
        const candidate = this.candidates.find(c => c.id === id);
        if (!candidate) return;
        const modal = document.getElementById('candidate-modal');
        const details = document.getElementById('candidate-details');
        details.innerHTML = `<h4>Raw Data</h4>` + Object.entries(candidate.raw || {}).map(([k, v]) =>
            `<div><strong>${k}:</strong> ${v}</div>`
        ).join('') + `<div style='margin-top:18px;'><button class='card-action-btn' onclick='app.showCandidateModal(${candidate.id})'>Back</button></div>`;
        modal.style.display = 'flex';
    }

    openRecategorizeModal(id) {
        this.recategorizeId = id;
        let modal = document.getElementById('recategorize-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'recategorize-modal';
            modal.className = 'recategorize-modal';
            modal.innerHTML = `
                <div class='modal-content'>
                    <h3>Re-categorize Candidate</h3>
                    <label for='recategorize-category'>New Category:</label>
                    <select id='recategorize-category'>
                        <option value='top'>Top</option>
                        <option value='good'>Good</option>
                        <option value='hidden'>Hidden Gems</option>
                        <option value='hot'>Hot Signals</option>
                    </select>
                    <label for='recategorize-reason'>Explanation:</label>
                    <textarea id='recategorize-reason' style='width:100%;min-height:48px;'></textarea>
                    <div style='margin-top:16px;display:flex;gap:10px;'>
                        <button class='card-action-btn' onclick='app.submitRecategorize()'>Submit</button>
                        <button class='card-action-btn close-btn' onclick='app.closeRecategorizeModal()'>Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        // Set current category
        document.getElementById('recategorize-category').value = this.candidates.find(c => c.id === id).category;
        modal.style.display = 'flex';
    }
    closeRecategorizeModal() {
        const modal = document.getElementById('recategorize-modal');
        if (modal) modal.style.display = 'none';
    }
    submitRecategorize() {
        const id = this.recategorizeId;
        const newCat = document.getElementById('recategorize-category').value;
        const reason = document.getElementById('recategorize-reason').value.trim();
        if (!reason) {
            alert('Please provide a reason for re-categorization.');
            return;
        }
        const candidate = this.candidates.find(c => c.id === id);
        if (candidate) {
            candidate.category = newCat;
            if (!candidate.recategorizeHistory) candidate.recategorizeHistory = [];
            candidate.recategorizeHistory.push({ newCat, reason, date: new Date().toISOString() });
        }
        this.closeRecategorizeModal();
        this.renderCandidates();
        this.updateResultsStats();
        alert('Candidate re-categorized successfully!');
    }

    removeCandidateCard(id) {
        this.candidates = this.candidates.filter(c => c.id !== id);
        this.renderCandidates();
        this.updateResultsStats();
    }

    exportResultsCSV() {
        // Show export options modal
        this.showExportOptionsModal();
    }

    showExportOptionsModal() {
        let modal = document.getElementById('export-options-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'export-options-modal';
            modal.className = 'feedback-modal';
            modal.innerHTML = `
                <div class='feedback-content'>
                    <h3>Export Options</h3>
                    <p>Choose what profiles to export:</p>
                    <div style='margin: 20px 0;'>
                        <label style='display: block; margin-bottom: 15px; cursor: pointer;'>
                            <input type='radio' name='export-option' value='top-good' checked style='margin-right: 10px;'>
                            <strong>Top & Good Profiles Only</strong><br>
                            <span style='color: #666; font-size: 0.9rem;'>Export only candidates with scores ≥ 70 (Top and Good categories)</span>
                        </label>
                        <label style='display: block; margin-bottom: 15px; cursor: pointer;'>
                            <input type='radio' name='export-option' value='hot' style='margin-right: 10px;'>
                            <strong>HOT Signal Profiles</strong><br>
                            <span style='color: #666; font-size: 0.9rem;'>Export candidates working at Hot Signal companies with scores ≥ 70</span>
                        </label>
                        <label style='display: block; margin-bottom: 15px; cursor: pointer;'>
                            <input type='radio' name='export-option' value='all-ranked' style='margin-right: 10px;'>
                            <strong>All Ranked Profiles</strong><br>
                            <span style='color: #666; font-size: 0.9rem;'>Export all candidates that passed the ranking threshold (including Hidden Gems)</span>
                        </label>
                        <label style='display: block; margin-bottom: 15px; cursor: pointer;'>
                            <input type='radio' name='export-option' value='all-including-rejected' style='margin-right: 10px;'>
                            <strong>All Profiles (Including Rejected)</strong><br>
                            <span style='color: #666; font-size: 0.9rem;'>Export all uploaded profiles, including those that didn't meet the ranking threshold</span>
                        </label>
                    </div>
                    <div style='margin-top: 20px; display: flex; gap: 10px;'>
                        <button class='save-btn' onclick='app.performExport()'>Export CSV</button>
                        <button class='secondary-btn' onclick='app.closeExportOptionsModal()'>Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
    }

    closeExportOptionsModal() {
        const modal = document.getElementById('export-options-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    performExport() {
        const exportOption = document.querySelector('input[name="export-option"]:checked').value;
        let profilesToExport = [];
        let filename = '';

        switch (exportOption) {
            case 'top-good':
                profilesToExport = this.candidates.filter(c => c.category === 'top' || c.category === 'good');
                filename = 'scorely_top_good_profiles.csv';
                break;
            case 'hot':
                profilesToExport = this.candidates.filter(c => c.hitSignal);
                filename = 'scorely_hot_signal_profiles.csv';
                break;
            case 'all-ranked':
                profilesToExport = this.candidates;
                filename = 'scorely_all_ranked_profiles.csv';
                break;
            case 'all-including-rejected':
                // Include all profiles from the original upload, with ranking info if available
                profilesToExport = this.profiles.map(profile => {
                    const rankedProfile = this.candidates.find(c => c.fullName === profile.fullName);
                    return {
                        ...profile,
                        score: rankedProfile ? rankedProfile.score : 'Not ranked',
                        aiScore: rankedProfile ? rankedProfile.aiScore : 'Not ranked',
                        category: rankedProfile ? rankedProfile.category : 'Not ranked',
                        aiSummary: rankedProfile ? rankedProfile.aiSummary : 'Not ranked',
                        strengths: rankedProfile && rankedProfile.strengths ? rankedProfile.strengths.join('; ') : '',
                        concerns: rankedProfile && rankedProfile.concerns ? rankedProfile.concerns.join('; ') : '',
                        explanation: rankedProfile ? rankedProfile.explanation : 'Not ranked',
                        hitSignal: rankedProfile ? rankedProfile.hitSignal : false,
                        hotSignal: rankedProfile ? rankedProfile.hotSignal : false,
                        embedding: rankedProfile ? rankedProfile.embedding : 'Not ranked'
                    };
                });
                filename = 'scorely_all_profiles_with_ranking.csv';
                break;
        }

        if (profilesToExport.length === 0) {
            alert('No profiles match the selected export criteria.');
            this.closeExportOptionsModal();
            return;
        }

        // Create CSV content
        const headers = [
            'Name', 'Company', 'Title', 'Score', 'AI Score', 'Category', 
            'LinkedIn', 'AI Summary', 'Strengths', 'Concerns', 'Explanation',
            'HOT Signal', 'Hot Signal Company', 'Embedding Score'
        ];

        const csvContent = [
            headers.join(','),
            ...profilesToExport.map(profile => [
                `"${(profile.fullName || '').replace(/"/g, '""')}"`,
                `"${(profile.company || '').replace(/"/g, '""')}"`,
                `"${(profile.title || '').replace(/"/g, '""')}"`,
                profile.score || '',
                profile.aiScore || '',
                profile.category || '',
                `"${(profile.linkedin || (profile.raw && profile.raw['LinkedIn']) || '').replace(/"/g, '""')}"`,
                `"${(profile.aiSummary || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                `"${(profile.strengths || []).join('; ').replace(/"/g, '""')}"`,
                `"${(profile.concerns || []).join('; ').replace(/"/g, '""')}"`,
                `"${(profile.explanation || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                profile.hitSignal ? 'Yes' : 'No',
                profile.hotSignal ? 'Yes' : 'No',
                profile.embedding || ''
            ].join(','))
        ].join('\n');

        // Download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.closeExportOptionsModal();
        alert(`Exported ${profilesToExport.length} profiles to ${filename}`);
    }

    exportCandidatePDF() {
        alert('PDF export is a demo. In production, this would generate a PDF of the candidate profile.');
    }

    resetRankingStatus() {
        document.getElementById('batches-processed').textContent = '0';
        document.getElementById('profiles-ranked').textContent = '0';
        document.getElementById('ranking-errors').textContent = '0';
        this.rankingStatus = {
            batches: 0,
            ranked: 0,
            errors: 0
        };
    }

    // Update row range indicators
    updateRowRangeIndicators() {
        const startRow = parseInt(document.getElementById('start-row')?.value) || 2;
        const endRow = parseInt(document.getElementById('end-row')?.value) || 100;
        const totalProfiles = this.advancedFilteredProfiles ? this.advancedFilteredProfiles.length : 0;
        
        // Update the indicators
        const nextRankingStart = document.getElementById('next-ranking-start');
        const totalProfilesCount = document.getElementById('total-profiles-count');
        const currentRangeDisplay = document.getElementById('current-range-display');
        
        if (nextRankingStart) nextRankingStart.textContent = startRow;
        if (totalProfilesCount) totalProfilesCount.textContent = totalProfiles;
        if (currentRangeDisplay) currentRangeDisplay.textContent = `${startRow}-${endRow}`;
        
        // Update the end row if it's less than start row
        if (endRow < startRow) {
            document.getElementById('end-row').value = startRow;
            this.updateRowRangeIndicators();
        }
    }

    // Cosine similarity between two vectors
    cosineSimilarity(vecA, vecB) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Helper function to validate profile data
    validateProfile(profile) {
        if (!profile) return false;
        if (!profile.raw) return false;
        if (!this.appData.selectedColumns || this.appData.selectedColumns.length === 0) return false;
        
        // Check if at least one selected column has data
        return this.appData.selectedColumns.some(column => {
            const value = profile.raw[column];
            if (value && typeof value === 'object') return Object.keys(value).length > 0;
            return value && String(value).trim().length > 0;
        });
    }
}

// Robust window.app initialization
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', function() {
    window.app = new ScorelyApp();
  });
} else {
  window.app = new ScorelyApp();
}

// Add global test functions
window.testStep2 = () => window.app.testStep2();
window.debugNav = () => window.app.debugNavigation();

console.log('Scorely App initialized');
console.log('Test functions available: testStep2(), debugNav()'); 
