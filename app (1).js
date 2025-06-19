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

    // Navigation
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            this.updateProgressBar();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateProgressBar();
        }
    }

    updateStepDisplay() {
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
        
        // Update navigation buttons
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        prevBtn.disabled = this.currentStep === 1;
        nextBtn.disabled = this.currentStep === this.totalSteps;
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

    // Data Saving
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
                this.appData.industry = this.getSelectedCheckboxValues('industry-select');
                break;
            case 'education':
                this.appData.education = this.getSelectedCheckboxValues('education-select');
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

    getSelectedCheckboxValues(containerId) {
        const container = document.getElementById(containerId);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    showSavedIndicator(fieldName) {
        const indicators = document.querySelectorAll('.saved-indicator');
        indicators.forEach(indicator => {
            if (indicator.closest('.form-section').querySelector(`[data-field="${fieldName}"]`)) {
                indicator.style.display = 'inline';
                indicator.classList.add('show');
                setTimeout(() => {
                    indicator.classList.remove('show');
                    setTimeout(() => {
                        indicator.style.display = 'none';
                    }, 300);
                }, 2000);
            }
        });
    }

    // Data Loading
    loadSavedData() {
        // Load job description
        if (this.appData.jobDescription) {
            document.getElementById('job-description').value = this.appData.jobDescription;
            this.updateCharacterCounter(document.getElementById('job-description'));
        }

        // Load target companies
        if (this.appData.targetCompanies) {
            document.getElementById('target-companies').value = this.appData.targetCompanies;
        }

        // Load experience range
        if (this.appData.experienceRange) {
            document.getElementById('min-experience').value = this.appData.experienceRange.min;
            document.getElementById('max-experience').value = this.appData.experienceRange.max;
        }

        // Load industry selections
        if (this.appData.industry) {
            this.appData.industry.forEach(value => {
                const checkbox = document.querySelector(`#industry-select input[value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Load education selections
        if (this.appData.education) {
            this.appData.education.forEach(value => {
                const checkbox = document.querySelector(`#education-select input[value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Load custom traits
        if (this.appData.customTraits) {
            this.renderTraits();
        }

        // Load hot signals
        if (this.appData.hotSignals) {
            document.getElementById('hot-signals').value = this.appData.hotSignals;
        }

        // Load ranking weights
        if (this.appData.rankingWeights) {
            Object.keys(this.appData.rankingWeights).forEach(key => {
                const element = document.getElementById(key === 'customTraitsWeight' ? 'custom-traits-weight' : 
                                                     key === 'education' ? 'education-weight' : key);
                if (element) {
                    element.value = this.appData.rankingWeights[key];
                    const valueDisplay = element.parentElement.querySelector('.slider-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${this.appData.rankingWeights[key]}%`;
                    }
                }
            });
        }
    }

    // Tooltips
    setupTooltips() {
        // Tooltips are handled by CSS hover states
    }

    // Row Range Indicators
    updateRowRangeIndicators() {
        const startRow = parseInt(document.getElementById('start-row')?.value) || 2;
        const endRow = parseInt(document.getElementById('end-row')?.value) || 100;
        
        const nextStart = document.getElementById('next-ranking-start');
        const totalCount = document.getElementById('total-profiles-count');
        const currentRange = document.getElementById('current-range-display');
        
        if (nextStart) nextStart.textContent = startRow;
        if (totalCount) totalCount.textContent = Math.max(0, endRow - startRow + 1);
        if (currentRange) currentRange.textContent = `${startRow}-${endRow}`;
    }

    // Placeholder methods for Step 2+ functionality
    saveColumnMapping() {
        console.log('Column mapping saved');
    }

    saveFilterList(listType) {
        console.log(`Filter list ${listType} saved`);
    }

    clearFilterList(listType) {
        const textarea = document.getElementById(listType === 'pastCandidates' ? 'past-candidates' : 
                                               listType === 'noGoCompanies' ? 'no-go-companies' : listType);
        if (textarea) {
            textarea.value = '';
        }
    }

    addCustomNoGo() {
        const input = document.getElementById('custom-no-go-input');
        const company = input.value.trim();
        if (company) {
            const textarea = document.getElementById('no-go-companies');
            textarea.value += (textarea.value ? '\n' : '') + company;
            input.value = '';
        }
    }

    runFiltering() {
        console.log('Running filtering...');
    }

    clearDashboard() {
        console.log('Clearing dashboard...');
    }

    selectAllColumns() {
        console.log('Selecting all columns...');
    }

    clearAllColumns() {
        console.log('Clearing all columns...');
    }

    saveColumnSelection() {
        console.log('Column selection saved');
    }

    previewProfileSummary() {
        console.log('Previewing profile summary...');
    }

    applyAdvancedFilters() {
        console.log('Applying advanced filters...');
    }

    resetAdvancedFilters() {
        console.log('Resetting advanced filters...');
    }

    startRanking() {
        console.log('Starting ranking...');
    }

    stopRanking() {
        console.log('Stopping ranking...');
    }

    switchResultsTab(tab) {
        console.log(`Switching to ${tab} tab`);
    }

    searchResults() {
        console.log('Searching results...');
    }

    exportResultsCSV() {
        console.log('Exporting results to CSV...');
    }

    closeCandidateModal() {
        document.getElementById('candidate-modal').style.display = 'none';
    }

    closeRecategorizeModal() {
        document.getElementById('recategorize-modal').style.display = 'none';
    }

    submitRecategorize() {
        console.log('Submitting recategorization...');
        this.closeRecategorizeModal();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ScorelyApp();
});

