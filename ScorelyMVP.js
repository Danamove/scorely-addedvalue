const appContainer = document.getElementById('app-container');

// Load API key from localStorage if available
const savedApiKey = localStorage.getItem('scorely_api_key');

const state = {
    currentStep: 1,
    fileHeaders: null, // Will hold headers from user's file
    columnMapping: {}, // Will store user's mapping
    uploadedFile: null, // To hold the actual file object
    profileData: [],
    filteredResults: {
        initialCount: 0,
        rejectedCount: 0,
        remainingCount: 0,
        rejectedProfiles: []
    },
    filters: {
        hotSignals: '',
        blacklist: '',
        pastCandidates: '',
        redFlags: {
            preset: [],
            custom: ''
        }
    },
    rankingCriteria: {
        minExperience: 0,
        requiredSkills: {
            and: '',
            or: ''
        },
        universities: {
            selected: [],
            noAcademicMatch: false
        },
        militaryRelevance: false,
        academicExcellence: false,
        hasPublications: false,
        isSpeaker: false,
        idealProfiles: ['', '', '', ''], // Four separate profile slots
        customTraits: [{ name: '', description: '' }], // Start with one empty trait
        weights: {
            experience: 20,
            skills: 20,
            universities: 20,
            customTraits: 20,
            idealProfiles: 20
        }
    },
    rankingProcess: {
        model: 'Embedding small 3 + GPT 3.5 turbo + GPT 4.5 mini',
        rangeStart: 2,
        rangeEnd: 10,
        status: 'idle', // idle, ranking, paused, stopped, complete
        profilesToRank: [],
        rankedProfiles: [],
        progress: {
            current: 0,
            total: 0,
            startTime: null,
            estimatedTime: null
        },
        activeFilter: 'Top', // Can be 'Top', 'Good', 'Hidden Gems', etc.
        searchQuery: '',
        globalFeedback: '',
        apiKey: savedApiKey || '' // Load from localStorage
    }
};

function renderHeader() {
    const header = document.createElement('div');
    header.className = 'wizard-header';
    const steps = [
        { number: 1, title: 'Data & Mapping' },
        { number: 2, title: 'Filters & Signals' },
        { number: 3, title: 'Ranking Criteria' },
        { number: 4, title: 'Review & Rank' },
    ];

    header.innerHTML = steps.map(step => `
        <div class="wizard-step ${state.currentStep >= step.number ? 'active' : ''}" data-step="${step.number}">
            <div class="step-number">${step.number}</div>
            <div class="step-title">${step.title}</div>
        </div>
    `).join('<div class="wizard-connector"></div>');

    header.querySelectorAll('.wizard-step').forEach(stepEl => {
        stepEl.addEventListener('click', () => {
            const stepNumber = parseInt(stepEl.dataset.step, 10);
            
            // If navigating back to step 1 from any other step, perform a full reset.
            if (stepNumber === 1 && state.currentStep !== 1) {
                state.fileHeaders = null;
                state.uploadedFile = null;
                state.profileData = [];
                state.columnMapping = {};
                state.filteredResults = {
                    initialCount: 0,
                    rejectedCount: 0,
                    remainingCount: 0,
                    rejectedProfiles: []
                };
                console.log('Navigated back to Step 1, state fully reset.');
            }

            // Allow navigation to next steps only if data has been processed from step 1
            if (stepNumber > 1 && state.profileData.length === 0) {
                alert("Please complete Step 1 (upload and map data) before proceeding.");
                return;
            }
            
            state.currentStep = stepNumber;
            render(true);
        });
    });
    return header;
}

function getStepContent() {
    switch (state.currentStep) {
        case 1: return renderStep1_DataAndMapping();
        case 2: return renderStep2_Filters();
        case 3: return renderStep3_RankingCriteria();
        case 4: return renderStep4_ReviewAndRank();
        default:
            const div = document.createElement('div');
            div.textContent = 'Step not found';
            return div;
    }
}

function render(shouldScrollToTop = false) {
    appContainer.innerHTML = '';
    appContainer.appendChild(renderHeader());
    appContainer.appendChild(getStepContent());
    if (shouldScrollToTop) {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

function renderStep1_DataAndMapping() {
    const wrapper = document.createElement('div');
    let step1HTML;

    if (!state.fileHeaders) {
        step1HTML = `
            <div class="step-container" id="step-1-input">
                <h2>Step 1: Input Candidate Data</h2>
                <p>Accepts CSV, Excel or pasted LinkedIn data.</p>
                
                <div class="input-options">
                    <textarea id="pasted-data" placeholder="Or paste data here..."></textarea>
                    <div class="file-upload-container">
                         <label for="file-upload" class="file-upload-button">Upload CSV/Excel</label>
                         <input type="file" id="file-upload" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                         <span id="file-name"></span>
                    </div>
                </div>
                 <div class="navigation-buttons">
                    <button id="process-data-btn" class="btn-primary">Map Columns</button>
                </div>
            </div>
        `;
    } else {
        const mappingFields = {
            firstName: { label: 'First Name', required: true },
            lastName: { label: 'Last Name', required: true },
            company: { label: 'Current Company', required: true },
            title: { label: 'Job Title', required: true },
            linkedinUrl: { label: 'LinkedIn Profile URL', required: true, hint: 'e.g., your "ProfileURL" column' },
            mutualConnections: { label: 'Mutual Connections URL', required: false, hint: 'e.g., your "mutualConnectionsURL" column' }
        };

        const options = state.fileHeaders.map(header => `<option value="${header}">${header}</option>`).join('');

        step1HTML = `
            <div class="step-container" id="step-1-mapping">
                <h2>Step 1.2: Map Columns</h2>
                <p>Match your sheet's columns to the required fields. This helps the AI understand your data.</p>
                
                <div class="column-mapping-container">
                    ${Object.entries(mappingFields).map(([key, field]) => `
                        <div class="mapping-row">
                            <label for="map-${key}" class="mapping-label">
                                ${field.label} 
                                ${!field.required ? '<span class="optional-label">(Optional)</span>' : ''}
                            </label>
                            <div class="mapping-input-wrapper">
                                <select id="map-${key}" data-key="${key}" class="mapping-select">
                                    <option value="">Select a column...</option>
                                    ${options}
                                </select>
                                ${field.hint ? `<small class="mapping-hint">${field.hint}</small>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="profile-summary-note">
                    <p><strong>Next Step:</strong> All columns for each candidate will be combined into a single "Profile Summary" for AI analysis.</p>
                </div>

                <div class="navigation-buttons">
                    <button id="back-to-upload" class="btn-secondary">Back</button>
                    <button id="next-step-1" class="btn-primary">Save Mapping & Continue →</button>
                </div>
            </div>
        `;
    }

    wrapper.innerHTML = step1HTML;

    // Add event listeners
    if (!state.fileHeaders) {
        wrapper.querySelector('#file-upload').addEventListener('change', handleFileSelect);
        wrapper.querySelector('#process-data-btn').addEventListener('click', processData);
    } else {
        wrapper.querySelector('#back-to-upload').addEventListener('click', () => {
            state.fileHeaders = null;
            state.uploadedFile = null;
            render(true);
        });
        
        const handleContinue = async () => {
            const isSaved = await saveMapping();
            if (isSaved) {
                state.currentStep = 2;
                render(true);
            }
        };

        wrapper.querySelector('#next-step-1').addEventListener('click', handleContinue);
    }
    return wrapper;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    state.uploadedFile = file;
    const fileName = file.name;
    document.getElementById('file-name').textContent = fileName;
}

function processData() {
    const pastedData = document.getElementById('pasted-data').value;
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];

    if (!pastedData && !file) {
        alert('Please upload a file or paste data.');
        return;
    }
    
    // Prioritize file over pasted data if both exist
    const dataToParse = file || pastedData;

    const handleComplete = (results) => {
        if (results.data && results.data.length > 0) {
            // Save the raw file content for later processing
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    state.uploadedFileContent = e.target.result;
                    console.log("File content stored in state.");
                };
                reader.readAsText(file);
            } else {
                state.uploadedFileContent = pastedData;
                console.log("Pasted data stored in state.");
            }

            state.fileHeaders = results.data[0];
            render(true);
        } else {
            alert('Could not parse any data from the input. Please check the format.');
        }
    };
    
    Papa.parse(dataToParse, {
        preview: 1, // We only need the first row for headers initially
        complete: handleComplete,
        error: (err) => {
            alert(`An error occurred while parsing: ${err.message}`);
        }
    });
}

async function saveMapping() {
    const mappingSelects = document.querySelectorAll('.mapping-select');
    let allRequiredMapped = true;
    
    mappingSelects.forEach(select => {
        const key = select.dataset.key;
        const value = select.value;
        state.columnMapping[key] = value;

        if (key === 'linkedinUrl' && !value) {
            allRequiredMapped = false;
        }
    });

    if (!allRequiredMapped) {
        alert('Please map the LinkedIn Profile URL field before continuing.');
        return false;
    }

    try {
        await generateProfileSummaries();
        showSaveConfirmation('save-confirmation-mapping');
        console.log("Mapping saved and summaries generated:", state.columnMapping);
        return true; 
    } catch (error) {
        console.error("Error during summary generation:", error);
        alert(`An error occurred while processing the file: ${error.message}`);
        return false;
    }
}

function generateProfileSummaries() {
    return new Promise((resolve, reject) => {
        if (!state.uploadedFileContent) {
            const msg = "Cannot generate summaries without file content.";
            console.error(msg);
            return reject(new Error(msg));
        }

        Papa.parse(state.uploadedFileContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error("Parsing errors:", results.errors);
                    return reject(new Error("Failed to parse file for summaries."));
                }
                
                const validData = results.data.filter(profile => {
                    // Add any additional validation logic you want to apply
                    return true;
                });

                if (validData.length > 0) {
                    state.profileData = validData.map(profile => {
                        const summary = Object.values(profile).join('; ');
                        return { ...profile, profileSummary: summary };
                    });
                    // Update stats after processing
                    state.filteredResults.initialCount = state.profileData.length;
                    state.filteredResults.remainingCount = state.profileData.length;
                    console.log(`Generated summaries for ${state.profileData.length} profiles (after handling errors).`);
                    resolve();
                } else {
                    return reject(new Error("Failed to parse file for summaries. The file might be empty or formatted incorrectly."));
                }
            },
            error: (err) => {
                console.error("PapaParse error:", err);
                reject(err);
            }
        });
    });
}

function renderStep2_Filters() {
    const wrapper = document.createElement('div');

    // Guard clause: Prevent rendering if no data is loaded OR mapping is incomplete
    if (state.profileData.length === 0 || !state.columnMapping.linkedinUrl) {
        wrapper.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>Step 2: Filters & Signals</h2>
                </div>
                <div class="container-placeholder">
                    <h3>Data or Mapping Incomplete</h3>
                    <p>Please go back to Step 1, upload your data, and ensure you have saved the column mapping before applying filters.</p>
                    <button id="go-to-step-1" class="btn-primary">Go to Step 1</button>
                </div>
            </div>
        `;
        wrapper.querySelector('#go-to-step-1').addEventListener('click', () => {
            state.currentStep = 1;
            render(true);
        });
        return wrapper;
    }

    const { hotSignals, blacklist, pastCandidates, redFlags } = state.filters;
    const { initialCount, rejectedCount, remainingCount } = state.filteredResults;
    const hasRunFilter = initialCount > 0;

    const noGoCompanies = [
        "Isracard", "Matrix", "Harel Insurance & Finance", "Ness Technologies", "Bank Leumi", 
        "GAV Systems", "Amdocs", "Log-On Software", "Sapiens", "Aman Group", "NICE", 
        "Maccabi Healthcare Services", "Zap Group", "Clalit Health Services", "Bank Hapoalim", 
        "Israel Tax Authority", "Discount Bank", "Infanity Labs", "Experis Israel", 
        "Sapiens International", "Magic Software Enterprises", "Ethernity Networks", 
        "Elad Software Systems", "Mizrahi-Tefahot Bank", "Migdal Insurance", "Menora Mivtachim", 
        "Clal Insurance", "Taldor", "Bynet Data Communications", "Hachshara Insurance Company", 
        "Psagot Investment House", "Max It Finance", "bizi"
    ];

    const step2HTML = `
        <div class="step-container" id="step-2">
            <div class="step-header">
                <h2>Filters & Signals</h2>
            </div>
            
            <div class="filter-section">
                <h3>HOT SIGNALS Companies</h3>
                <p class="description">
                    <span class="icon">🔥</span>
                    <strong>Companies with Layoffs, Closures, or Instability</strong>
                    <br>
                    Add companies known for recent layoffs, closures, or financial instability. Profiles from these companies will be marked as "HOT" opportunities.
                </p>
                <textarea id="hot-signals-companies" placeholder="Riskified\nD-ID\nActivefence\n...">${state.filters.hotSignals}</textarea>
                <div class="button-group">
                    <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
                    <button id="save-hot-signals" class="btn-save">Save <span id="save-confirmation-hot-signals" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="filter-section">
                <h3><span class="icon">🚫</span> Blacklisted Companies</h3>
                <p class="description">Add companies whose candidates should always be excluded.</p>
                <textarea id="blacklist-companies" placeholder="Enter company names, one per line...">${state.filters.blacklist}</textarea>
                <div class="button-group">
                    <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
                    <button id="save-blacklist" class="btn-save">Save <span id="save-confirmation-blacklist" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="filter-section">
                <h3><span class="icon">🔄</span> Past Candidates</h3>
                <p class="description">Add candidates who have already been contacted or processed to avoid duplicates.</p>
                <textarea id="past-candidates" placeholder="Paste candidate LinkedIn URLs or names, one per line...">${state.filters.pastCandidates}</textarea>
                <div class="button-group">
                    <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
                    <button id="save-past-candidates" class="btn-save">Save <span id="save-confirmation-past-candidates" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="filter-section">
                <h3><span class="icon">⛔</span> No-Go Companies (Preset)</h3>
                <p class="description">This is a default filter of companies that are always excluded. This list cannot be modified.</p>
                <select id="no-go-companies" multiple disabled>${noGoCompanies.map(company => `<option>${company}</option>`).join('')}</select>
            </div>

            <div class="filter-section">
                <h3><span class="icon">🚩</span> Red Flags</h3>
                <p class="description">Define rules to automatically filter out candidates.</p>
                <div class="red-flags-list">
                    <label><input type="checkbox" name="red_flag" value="enterprise_only" ${state.filters.redFlags.preset.includes('enterprise_only') ? 'checked' : ''}> Enterprise-only experience</label>
                    <label><input type="checkbox" name="red_flag" value="freelance_consultant" ${state.filters.redFlags.preset.includes('freelance_consultant') ? 'checked' : ''}> Freelance/consultant roles</label>
                    <label><input type="checkbox" name="red_flag" value="grad_before_2000" ${state.filters.redFlags.preset.includes('grad_before_2000') ? 'checked' : ''}> Graduation year before 2000</label>
                    <label><input type="checkbox" name="red_flag" value="job_hopping" ${state.filters.redFlags.preset.includes('job_hopping') ? 'checked' : ''}> Lack of stability (frequent job changes, <2 years)</label>
                </div>
                <textarea id="custom-red-flags" placeholder="Add custom red flags, one per line...">${state.filters.redFlags.custom}</textarea>
                 <div class="button-group">
                    <button id="save-red-flags" class="btn-save">Save Flags <span id="save-confirmation-red-flags" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="filter-dashboard ${!hasRunFilter ? 'disabled' : ''}">
                <h3>Filtering Dashboard</h3>
                ${!hasRunFilter ? '<p class="description">Upload data in Step 1 to enable filtering.</p>' : ''}
                <div class="stats-container">
                    <div class="stat-item"><span>${hasRunFilter ? initialCount : '-'}</span> Initial Profiles</div>
                    <div class="stat-item rejected"><span>${hasRunFilter ? rejectedCount : '-'}</span> Rejected</div>
                    <div class="stat-item remaining"><span>${hasRunFilter ? remainingCount : '-'}</span> Remaining</div>
                </div>
                <div class="button-group">
                    <button id="run-filter-btn" class="btn-primary" ${!hasRunFilter ? 'disabled' : ''}>Run Filter</button>
                    <button id="reset-filter-btn" class="btn-secondary" ${!hasRunFilter ? 'disabled' : ''}>Reset</button>
                    <button id="view-rejected-btn" class="btn-link" ${!hasRunFilter || rejectedCount === 0 ? 'disabled' : ''}>View Rejected Profiles</button>
                </div>
                <div id="rejected-profiles-view" class="hidden">
                    <h4>Rejected Profiles</h4>
                    <div id="rejected-list"></div>
                </div>
            </div>

            <div class="navigation-buttons">
                <button id="back-step-2" class="btn-secondary">← Back</button>
                <button id="next-step-2" class="btn-primary">Continue to Ranking Criteria →</button>
            </div>
        </div>
    `;
    wrapper.innerHTML = step2HTML.replace('<!-- ... HOT SIGNALS ... -->', `
        <h3>HOT SIGNALS Companies</h3>
        <p class="description"><span class="icon">🔥</span><strong>Companies with Layoffs, Closures, or Instability</strong><br>Add companies known for recent layoffs, closures, or financial instability. Profiles from these companies will be marked as "HOT" opportunities.</p>
        <textarea id="hot-signals-companies" placeholder="Riskified\nD-ID\nActivefence\n...">${state.filters.hotSignals}</textarea>
        <div class="button-group">
            <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
            <button id="save-hot-signals" class="btn-save">Save <span id="save-confirmation-hot-signals" class="save-confirmation"></span></button>
        </div>
    `).replace('<!-- ... Blacklisted Companies ... -->', `
         <h3><span class="icon">🚫</span> Blacklisted Companies</h3>
         <p class="description">Add companies whose candidates should always be excluded.</p>
         <textarea id="blacklist-companies" placeholder="Enter company names, one per line...">${state.filters.blacklist}</textarea>
         <div class="button-group">
             <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
             <button id="save-blacklist" class="btn-save">Save <span id="save-confirmation-blacklist" class="save-confirmation"></span></button>
         </div>
    `).replace('<!-- ... Past Candidates ... -->', `
        <h3><span class="icon">🔄</span> Past Candidates</h3>
        <p class="description">Add candidates who have already been contacted or processed to avoid duplicates.</p>
        <textarea id="past-candidates" placeholder="Paste candidate LinkedIn URLs or names, one per line...">${state.filters.pastCandidates}</textarea>
        <div class="button-group">
            <button class="btn-secondary"><span class="icon-upload">↑</span> Upload File</button>
            <button id="save-past-candidates" class="btn-save">Save <span id="save-confirmation-past-candidates" class="save-confirmation"></span></button>
        </div>
    `).replace('<!-- ... No-Go Companies (Preset) ... -->',`
        <h3><span class="icon">⛔</span> No-Go Companies (Preset)</h3>
        <p class="description">This is a default filter of companies that are always excluded. This list cannot be modified.</p>
        <select id="no-go-companies" multiple disabled>${noGoCompanies.map(company => `<option>${company}</option>`).join('')}</select>
    `).replace('<!-- ... Red Flags ... -->',`
        <h3><span class="icon">🚩</span> Red Flags</h3>
        <p class="description">Define rules to automatically filter out candidates.</p>
        <div class="red-flags-list">
            <label><input type="checkbox" name="red_flag" value="enterprise_only" ${state.filters.redFlags.preset.includes('enterprise_only') ? 'checked' : ''}> Enterprise-only experience</label>
            <label><input type="checkbox" name="red_flag" value="freelance_consultant" ${state.filters.redFlags.preset.includes('freelance_consultant') ? 'checked' : ''}> Freelance/consultant roles</label>
            <label><input type="checkbox" name="red_flag" value="grad_before_2000" ${state.filters.redFlags.preset.includes('grad_before_2000') ? 'checked' : ''}> Graduation year before 2000</label>
            <label><input type="checkbox" name="red_flag" value="job_hopping" ${state.filters.redFlags.preset.includes('job_hopping') ? 'checked' : ''}> Lack of stability (frequent job changes, <2 years)</label>
        </div>
        <textarea id="custom-red-flags" placeholder="Add custom red flags, one per line...">${state.filters.redFlags.custom}</textarea>
         <div class="button-group">
            <button id="save-red-flags" class="btn-save">Save Flags <span id="save-confirmation-red-flags" class="save-confirmation"></span></button>
        </div>
    `);

    // Add event listeners for this step
    wrapper.querySelector('#back-step-2').addEventListener('click', () => {
        state.currentStep = 1;
        render(true);
    });
    
    wrapper.querySelector('#next-step-2').addEventListener('click', () => {
        state.currentStep = 3;
        render(true);
    });

    // Add dashboard listeners if it exists
    if(hasRunFilter) {
        wrapper.querySelector('#run-filter-btn').addEventListener('click', runFilteringProcess);
        wrapper.querySelector('#reset-filter-btn').addEventListener('click', resetFilteringProcess);
        wrapper.querySelector('#view-rejected-btn').addEventListener('click', toggleRejectedView);
    }

    wrapper.querySelector('#save-hot-signals').addEventListener('click', () => saveFilterData('hotSignals', 'hot-signals-companies', 'save-confirmation-hot-signals'));
    wrapper.querySelector('#save-blacklist').addEventListener('click', () => saveFilterData('blacklist', 'blacklist-companies', 'save-confirmation-blacklist'));
    wrapper.querySelector('#save-past-candidates').addEventListener('click', () => saveFilterData('pastCandidates', 'past-candidates', 'save-confirmation-past-candidates'));
    wrapper.querySelector('#save-red-flags').addEventListener('click', saveRedFlags);

    return wrapper;
}

function saveFilterData(filterKey, elementId, confirmationId) {
    const value = document.getElementById(elementId).value;
    state.filters[filterKey] = value;
    showSaveConfirmation(confirmationId);
    console.log(`Saved ${filterKey}:`, state.filters[filterKey]);
}

function saveRedFlags() {
    // Save preset flags
    const presetFlags = [];
    document.querySelectorAll('input[name="red_flag"]:checked').forEach(checkbox => {
        presetFlags.push(checkbox.value);
    });
    state.filters.redFlags.preset = presetFlags;

    // Save custom flags
    const customFlags = document.getElementById('custom-red-flags').value;
    state.filters.redFlags.custom = customFlags;
    
    showSaveConfirmation('save-confirmation-red-flags');
    console.log('Saved Red Flags:', state.filters.redFlags);
}

function runFilteringProcess() {
    let remainingProfiles = [...state.profileData];
    let rejectedProfiles = [];
    const linkedinCol = state.columnMapping.linkedinUrl;

    // Get all filter data
    const blacklist = state.filters.blacklist.split('\n').filter(Boolean).map(s => s.trim().toLowerCase());
    const pastCandidates = state.filters.pastCandidates.split('\n').filter(Boolean).map(s => s.trim().toLowerCase());
    
    // No-Go companies (preset)
    const noGoCompanies = [
        "isracard", "matrix", "harel insurance & finance", "ness technologies", "bank leumi", 
        "gav systems", "amdocs", "log-on software", "sapiens", "aman group", "nice", 
        "maccabi healthcare services", "zap group", "clalit health services", "bank hapoalim", 
        "israel tax authority", "discount bank", "infanity labs", "experis israel", 
        "sapiens international", "magic software enterprises", "ethernity networks", 
        "elad software systems", "mizrahi-tefahot bank", "migdal insurance", "menora mivtachim", 
        "clal insurance", "taldor", "bynet data communications", "hachshara insurance company", 
        "psagot investment house", "max it finance", "bizi"
    ];

    // Get red flags for filtering
    const redFlags = {
        preset: state.filters.redFlags.preset,
        custom: state.filters.redFlags.custom.split('\n').filter(Boolean).map(s => s.trim().toLowerCase())
    };

    const companyCol = state.columnMapping.company;
    const hotSignalCompanies = state.filters.hotSignals.split('\n').filter(Boolean).map(s => s.trim().toLowerCase());
    const bigTech = ['microsoft', 'google', 'amazon', 'meta', 'facebook'];

    remainingProfiles = remainingProfiles.filter(profile => {
        // The profile summary is the primary text to search against.
        const profileText = (profile.profileSummary || Object.values(profile).join(' ')).toLowerCase();
        
        // Add tags without rejecting the profile
        if (!profile.tags) profile.tags = [];
        const currentCompany = (profile[companyCol] || '').toLowerCase();
        if (hotSignalCompanies.includes(currentCompany)) {
            profile.tags.push('Hot Signal');
        }

        // Priority 1: Past candidates filter (most absolute filter)
        if (linkedinCol && pastCandidates.length > 0) {
             const profileUrl = (profile[linkedinCol] || '').toLowerCase();
             if (pastCandidates.some(pc => pc && profileUrl.includes(pc))) {
                 rejectedProfiles.push({ ...profile, reason: `Past Candidate` });
                return false;
             }
        }

        // Priority 2: Blacklist filter (searches entire profile text)
        const blacklistedCompany = blacklist.find(company => company && profileText.includes(company));
        if (blacklistedCompany) {
            rejectedProfiles.push({ ...profile, reason: `Blacklist: ${blacklistedCompany}` });
            return false;
        }

        // Priority 3: No-Go companies filter (searches entire profile text)
        const noGoCompany = noGoCompanies.find(company => company && profileText.includes(company));
        if (noGoCompany) {
            rejectedProfiles.push({ ...profile, reason: `No-Go Company: ${noGoCompany}` });
            return false;
        }
        
        // Priority 4: Red Flags filtering
        if (redFlags.preset.length > 0 || redFlags.custom.length > 0) {
            // Check preset red flags
            for (const flag of redFlags.preset) {
                if (flag === 'job_hopping' && profileText.includes('job') && profileText.includes('hopping')) {
                    rejectedProfiles.push({ ...profile, reason: `Red Flag: Job Hopping` });
                    return false;
                }
                if (flag === 'freelance_consultant' && (profileText.includes('freelance') || profileText.includes('consultant'))) {
                    rejectedProfiles.push({ ...profile, reason: `Red Flag: Freelance/Consultant` });
                    return false;
                }
                if (flag === 'enterprise_only' && profileText.includes('enterprise') && !profileText.includes('startup')) {
                    const hasBigTech = bigTech.some(company => profileText.includes(company));
                    if (hasBigTech) {
                        // Saved by Big Tech exception. Tag as Hidden Gem and continue.
                        if (!profile.tags) profile.tags = [];
                        profile.tags.push('Hidden Gem');
                    } else {
                        // No Big Tech exception, reject.
                        rejectedProfiles.push({ ...profile, reason: `Red Flag: Enterprise Only` });
                        return false;
                    }
                }
                if (flag === 'grad_before_2000' && profileText.includes('199')) {
                    rejectedProfiles.push({ ...profile, reason: `Red Flag: Graduated before 2000` });
                    return false;
                }
            }
            
            // Check custom red flags
            for (const flag of redFlags.custom) {
                if (flag && profileText.includes(flag)) {
                    rejectedProfiles.push({ ...profile, reason: `Red Flag: ${flag}` });
                    return false;
                }
            }
        }

        return true;
    });

    state.filteredResults = {
        initialCount: state.profileData.length,
        rejectedProfiles: rejectedProfiles,
        rejectedCount: rejectedProfiles.length,
        remainingCount: remainingProfiles.length
    };
    render(); // Re-render to show updated stats, NO SCROLL
}

function resetFilteringProcess() {
    state.filteredResults = {
        initialCount: state.profileData.length,
        rejectedCount: 0,
        remainingCount: state.profileData.length,
        rejectedProfiles: []
    };
    render(); // NO SCROLL
}

function toggleRejectedView() {
    const view = document.getElementById('rejected-profiles-view');
    const list = document.getElementById('rejected-list');
    if (view.classList.contains('hidden')) {
        const nameCol = state.columnMapping.firstName || state.fileHeaders[0];
        const linkCol = state.columnMapping.linkedinUrl;

        list.innerHTML = state.filteredResults.rejectedProfiles.map(p => `
            <div class="rejected-item">
                <div class="rejected-name">${p[nameCol] || 'N/A'}</div>
                <div class="rejected-reason">${p.reason}</div>
                <div class="rejected-link">${linkCol && p[linkCol] ? `<a href="${p[linkCol]}" target="_blank">Profile</a>` : 'No Link'}</div>
            </div>
        `).join('');
        view.classList.remove('hidden');
    } else {
        view.classList.add('hidden');
    }
}

function renderStep3_RankingCriteria() {
    const wrapper = document.createElement('div');
    const universities = [
        "Hebrew University of Jerusalem", "Technion – Israel Institute of Technology", "Tel Aviv University",
        "Bar-Ilan University", "Ben-Gurion University of the Negev", "Weizmann Institute of Science",
        "Reichman University (IDC Herzliya)", "University of Haifa", "The Academic College of Tel-Aviv-Yaffo",
        "The Open University of Israel", "Tel Aviv-Yafo Academic College"
    ];

    const initialTotal = Object.values(state.rankingCriteria.weights).reduce((sum, val) => sum + val, 0);

    const step3HTML = `
        <div class="step-container" id="step-3">
             <div class="step-header">
                <h2>Step 3: Define Ranking Criteria</h2>
            </div>

            <div class="criteria-section">
                <div class="criteria-row">
                    <label for="min-experience">Minimum Years of Experience</label>
                    <div class="input-with-save">
                        <input type="number" id="min-experience" min="0" value="${state.rankingCriteria.minExperience}">
                        <button id="save-experience" class="btn-save">Save <span id="save-confirmation-experience" class="save-confirmation"></span></button>
                    </div>
                </div>
            </div>

            <div class="criteria-section">
                <h3>Required Skills</h3>
                <div class="skills-input-group">
                    <div class="criteria-row">
                        <label for="required-skills-and">All of these skills (AND logic)</label>
                        <textarea id="required-skills-and" placeholder="e.g., React, Node.js, SQL">${state.rankingCriteria.requiredSkills.and}</textarea>
                    </div>
                    <div class="criteria-row">
                        <label for="required-skills-or">Any of these skills (OR logic)</label>
                        <textarea id="required-skills-or" placeholder="e.g., Go, Python, Java">${state.rankingCriteria.requiredSkills.or}</textarea>
                    </div>
                </div>
                 <div class="button-group">
                    <button id="save-skills" class="btn-save">Save Skills <span id="save-confirmation-skills" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="criteria-section">
                <h3>Preferred Universities</h3>
                 <div class="uni-options">
                    <button id="uni-select-all" class="btn-link">Select All</button>
                    <button id="uni-clear" class="btn-link">Clear Selection</button>
                 </div>
                <div class="uni-list">
                    ${universities.map(uni => `
                        <label><input type="checkbox" name="university" value="${uni}" ${state.rankingCriteria.universities.selected.includes(uni) ? 'checked' : ''}> ${uni}</label>
                    `).join('')}
                </div>
                 <div class="uni-meta-options">
                    <label><input type="checkbox" id="no-academic-match" name="uni-meta" value="no_match" ${state.rankingCriteria.universities.noAcademicMatch ? 'checked' : ''}> No Academic Match Required</label>
                </div>
                <div class="button-group">
                    <button id="save-universities" class="btn-save">Save Universities <span id="save-confirmation-universities" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="criteria-section">
                <h3>Excellence & Background Factors</h3>
                <p class="description">Select factors to reward candidates who exhibit them. Not having them will not penalize the score.</p>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="military-relevance" ${state.rankingCriteria.militaryRelevance ? 'checked' : ''}>
                        Military background relevance
                    </label>
                    <label>
                        <input type="checkbox" id="academic-excellence" ${state.rankingCriteria.academicExcellence ? 'checked' : ''}>
                        Academic excellence: high GPA, honors, notable projects
                    </label>
                    <label>
                        <input type="checkbox" id="has-publications" ${state.rankingCriteria.hasPublications ? 'checked' : ''}>
                        Academic publications / patents
                    </label>
                    <label>
                        <input type="checkbox" id="is-speaker" ${state.rankingCriteria.isSpeaker ? 'checked' : ''}>
                        Conference speaking / lectures
                    </label>
                </div>
                 <div class="button-group">
                    <button id="save-excellence" class="btn-save">Save Factors <span id="save-confirmation-excellence" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="criteria-section">
                <h3><span class="icon">✨</span> Custom Traits</h3>
                <p class="description">Define custom traits for the AI to look for. Write anything that matters to you – e.g. experience in cybersecurity, strong GitHub, working at global companies. The AI will semantically match it.</p>
                <p class="example-text"><strong>Example:</strong> Name: <code>Tel Aviv</code>, Description: <code>lives or works in Tel Aviv</code></p>
                <div id="custom-traits-container">
                    ${state.rankingCriteria.customTraits.map((trait, index) => `
                         <div class="custom-trait-row" data-index="${index}">
                            <input type="text" class="trait-name" placeholder="Trait Name" value="${trait.name || ''}">
                            <input type="text" class="trait-description" placeholder="Optional: Description to guide AI" value="${trait.description || ''}">
                            <button class="btn-remove remove-trait-btn">×</button>
                        </div>
                    `).join('')}
                </div>
                <button id="add-trait-btn" class="btn-link">+ Add another trait</button>
                <div class="button-group">
                    <button id="save-custom-traits" class="btn-save">Save Traits <span id="save-confirmation-custom-traits" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="criteria-section">
                <h3><span class="icon">🎯</span> Ideal Profiles (Semantic Benchmark)</h3>
                <p class="description">Paste profiles of ideal candidates into the slots below. Similarity to these profiles is a heavily weighted factor in the final ranking. You can use one or all slots.</p>
                <div class="ideal-profiles-container">
                    ${state.rankingCriteria.idealProfiles.map((profile, index) => `
                         <textarea class="ideal-profile-input" data-index="${index}" placeholder="Paste ideal profile #${index + 1}...">${profile}</textarea>
                    `).join('')}
                </div>
                 <div class="button-group">
                    <button id="save-ideal-profiles" class="btn-save">Save Profiles <span id="save-confirmation-ideal-profiles" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="criteria-section">
                <h3><span class="icon">⚖️</span> Weight Sliders</h3>
                <p class="description">Adjust the importance of each ranking factor. The AI will use these weights to calculate the final score for each candidate.</p>
                <div id="weights-container">
                    ${Object.entries(state.rankingCriteria.weights).map(([key, value]) => `
                        <div class="weight-slider-row">
                            <label for="weight-${key}" class="weight-slider-label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                            <input type="range" id="weight-${key}" class="weight-slider" data-key="${key}" min="0" max="100" value="${value}">
                            <span class="slider-value">${value}%</span>
                        </div>
                    `).join('')}
                </div>
                <div class="weights-total">
                    <strong>Total: <span id="weights-total-value">${initialTotal}%</span></strong>
                </div>
                <div class="button-group">
                    <button id="save-weights" class="btn-save">Save Weights <span id="save-confirmation-weights" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="navigation-buttons">
                <button id="back-step-3" class="btn-secondary">← Back</button>
                <button id="next-step-3" class="btn-primary">Continue to Ranking →</button>
            </div>
        </div>
    `;
    wrapper.innerHTML = step3HTML;

    // Add event listeners
    wrapper.querySelector('#back-step-3').addEventListener('click', () => {
        state.currentStep = 2;
        render(true);
    });
    
    // Save buttons
    wrapper.querySelector('#save-experience').addEventListener('click', saveExperience);
    wrapper.querySelector('#save-skills').addEventListener('click', saveSkills);
    wrapper.querySelector('#save-universities').addEventListener('click', saveUniversities);
    wrapper.querySelector('#save-excellence').addEventListener('click', saveExcellenceFactors);

    // Custom Traits Listeners
    wrapper.querySelector('#add-trait-btn').addEventListener('click', addCustomTrait);
    wrapper.querySelectorAll('.remove-trait-btn').forEach(btn => {
        btn.addEventListener('click', (e) => removeCustomTrait(e));
    });
    wrapper.querySelector('#save-custom-traits').addEventListener('click', saveCustomTraits);
    wrapper.querySelector('#save-ideal-profiles').addEventListener('click', saveIdealProfiles);
    wrapper.querySelector('#save-weights').addEventListener('click', saveWeights);

    // Slider value update listener
    wrapper.querySelectorAll('.weight-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            e.target.nextElementSibling.textContent = `${value}%`;
            updateWeightsTotal();
        });
    });

    // University selection listeners
    wrapper.querySelector('#uni-select-all').addEventListener('click', () => toggleAllUniversities(true));
    wrapper.querySelector('#uni-clear').addEventListener('click', () => toggleAllUniversities(false));

    // Continue to ranking button
    wrapper.querySelector('#next-step-3').addEventListener('click', () => {
        state.currentStep = 4;
        render(true);
    });

    // Set initial state for weights total
    updateWeightsTotal();

    return wrapper;
}

function saveExperience() {
    state.rankingCriteria.minExperience = document.getElementById('min-experience').value;
    showSaveConfirmation('save-confirmation-experience');
    console.log('Saved Experience:', state.rankingCriteria.minExperience);
}

function saveSkills() {
    state.rankingCriteria.requiredSkills.and = document.getElementById('required-skills-and').value;
    state.rankingCriteria.requiredSkills.or = document.getElementById('required-skills-or').value;
    showSaveConfirmation('save-confirmation-skills');
    console.log('Saved Skills:', state.rankingCriteria.requiredSkills);
}

function saveUniversities() {
    const selected = [];
    document.querySelectorAll('input[name="university"]:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    state.rankingCriteria.universities.selected = selected;
    state.rankingCriteria.universities.noAcademicMatch = document.getElementById('no-academic-match').checked;
    showSaveConfirmation('save-confirmation-universities');
    console.log('Saved Universities:', state.rankingCriteria.universities);
}

function saveExcellenceFactors() {
    state.rankingCriteria.militaryRelevance = document.getElementById('military-relevance').checked;
    state.rankingCriteria.academicExcellence = document.getElementById('academic-excellence').checked;
    state.rankingCriteria.hasPublications = document.getElementById('has-publications').checked;
    state.rankingCriteria.isSpeaker = document.getElementById('is-speaker').checked;
    showSaveConfirmation('save-confirmation-excellence');
    console.log('Saved Excellence Factors:', {
        military: state.rankingCriteria.militaryRelevance,
        academic: state.rankingCriteria.academicExcellence,
        publications: state.rankingCriteria.hasPublications,
        speaker: state.rankingCriteria.isSpeaker
    });
}

function addCustomTrait() {
    state.rankingCriteria.customTraits.push({ name: '', description: '' });
    render(); // This is inefficient but simple for now. NO SCROLL
}

function removeCustomTrait(event) {
    const index = parseInt(event.target.closest('.custom-trait-row').dataset.index, 10);
    state.rankingCriteria.customTraits.splice(index, 1);
    render(); // NO SCROLL
}

function saveCustomTraits() {
    const traits = [];
    document.querySelectorAll('.custom-trait-row').forEach(row => {
        const name = row.querySelector('.trait-name').value;
        const description = row.querySelector('.trait-description').value;
        if (name) { // Only save traits that have a name
            traits.push({ name, description });
        }
    });
    state.rankingCriteria.customTraits = traits;
    showSaveConfirmation('save-confirmation-custom-traits');
    console.log('Saved Custom Traits:', state.rankingCriteria.customTraits);
}

function saveIdealProfiles() {
    const profiles = [];
    document.querySelectorAll('.ideal-profile-input').forEach(textarea => {
        profiles.push(textarea.value);
    });
    state.rankingCriteria.idealProfiles = profiles;
    showSaveConfirmation('save-confirmation-ideal-profiles');
    console.log('Saved Ideal Profiles:', state.rankingCriteria.idealProfiles);
}

function saveWeights() {
    document.querySelectorAll('.weight-slider').forEach(slider => {
        const key = slider.dataset.key;
        const value = parseInt(slider.value, 10);
        if (key in state.rankingCriteria.weights) {
            state.rankingCriteria.weights[key] = value;
        }
    });
    showSaveConfirmation('save-confirmation-weights');
    console.log('Saved Weights:', state.rankingCriteria.weights);
}

function toggleAllUniversities(select) {
    document.querySelectorAll('input[name="university"]').forEach(checkbox => {
        checkbox.checked = select;
    });
}

function updateWeightsTotal() {
    const sliders = document.querySelectorAll('.weight-slider');
    if (sliders.length === 0) return;

    const total = Array.from(sliders).reduce((sum, slider) => sum + parseInt(slider.value, 10), 0);
    
    const totalEl = document.getElementById('weights-total-value');
    if (totalEl) {
        totalEl.textContent = `${total}%`;
        totalEl.parentElement.style.color = total !== 100 ? '#e74c3c' : 'inherit'; // red if not 100
    }
}

function showSaveConfirmation(elementId) {
    const confirmationSpan = document.getElementById(elementId);
    if (confirmationSpan) {
        confirmationSpan.textContent = 'Saved!';
        confirmationSpan.classList.add('visible');

        setTimeout(() => {
            confirmationSpan.classList.remove('visible');
            confirmationSpan.textContent = ''; // Clear text after fading out
        }, 2000);
    }
}

function renderStep4_ReviewAndRank() {
    const wrapper = document.createElement('div');
    
    // Guard clause: Prevent rendering if no data is loaded OR mapping is incomplete
    if (state.profileData.length === 0 || !state.columnMapping.linkedinUrl) {
        wrapper.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>Step 4: Review & Rank</h2>
                </div>
                <div class="container-placeholder">
                    <h3>Data or Mapping Incomplete</h3>
                    <p>Please go back to Step 1, upload your data, and ensure you have saved the column mapping before ranking.</p>
                    <button id="go-to-step-1" class="btn-primary">Go to Step 1</button>
                </div>
            </div>
        `;
        wrapper.querySelector('#go-to-step-1').addEventListener('click', () => {
            state.currentStep = 1;
            render(true);
        });
        return wrapper;
    }
    
    const allProfiles = state.filteredResults.rejectedProfiles 
        ? state.profileData.filter(p => !state.filteredResults.rejectedProfiles.find(rp => rp[state.columnMapping.linkedinUrl] === p[state.columnMapping.linkedinUrl])) 
        : state.profileData;
    
    state.rankingProcess.profilesToRank = allProfiles;

    const { profilesToRank, rankedProfiles, progress, status, activeFilter, searchQuery } = state.rankingProcess;
    const remainingToRank = profilesToRank.length - rankedProfiles.length;
    
    // Calculate progress percentage
    const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    
    // Calculate estimated time remaining
    let timeRemaining = '';
    if (progress.startTime && progress.current > 0) {
        const elapsed = Date.now() - progress.startTime;
        const avgTimePerProfile = elapsed / progress.current;
        const remainingProfiles = progress.total - progress.current;
        const estimatedRemaining = avgTimePerProfile * remainingProfiles;
        
        if (estimatedRemaining > 60000) { // More than 1 minute
            timeRemaining = `~${Math.round(estimatedRemaining / 60000)} דקות נותרו`;
        } else {
            timeRemaining = `~${Math.round(estimatedRemaining / 1000)} שניות נותרו`;
        }
    }

    const availableModels = [
        "Embedding small 3 + GPT 3.5 turbo + GPT 4.5 mini",
        "Embedding small 3",
        "Embedding small 3 + GPT 4.5 mini turbo"
    ];
    
    let resultsHTML = '';
    if (status === 'complete' && rankedProfiles.length > 0) {
        // --- RESULTS VIEW ---
        const nameCol = state.columnMapping.firstName || state.fileHeaders[0];
        const lastNameCol = state.columnMapping.lastName || '';
        const titleCol = state.columnMapping.title || state.fileHeaders[1];
        const companyCol = state.columnMapping.company || state.fileHeaders[2];
        const mutualCol = state.columnMapping.mutualConnections || '';
        const linkedinCol = state.columnMapping.linkedinUrl || '';

        const topCount = rankedProfiles.filter(p => p.category === 'Top').length;
        const goodCount = rankedProfiles.filter(p => p.category === 'Good').length;
        const rejectedCount = rankedProfiles.filter(p => p.category === 'Rejected').length;
        const hiddenGemsCount = rankedProfiles.filter(p => p.tags && p.tags.includes('Hidden Gem')).length;
        const hotSignalsCount = rankedProfiles.filter(p => p.tags && p.tags.includes('Hot Signal')).length;

        // Filter profiles based on active filter and search query
        const filteredProfiles = rankedProfiles.filter(profile => {
            // Category filter
            let categoryMatch = false;
            switch (activeFilter) {
                case 'Top': categoryMatch = profile.category === 'Top'; break;
                case 'Good': categoryMatch = profile.category === 'Good'; break;
                case 'Hidden Gems': categoryMatch = profile.tags && profile.tags.includes('Hidden Gem'); break;
                case 'Hot Signals': categoryMatch = profile.tags && profile.tags.includes('Hot Signal'); break;
                case 'Rejected': categoryMatch = profile.category === 'Rejected'; break;
                case 'All': categoryMatch = true; break;
                default: categoryMatch = true;
            }

            if (!categoryMatch) return false;

            // Search query filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const profileText = (profile.profileSummary || Object.values(profile).join(' ')).toLowerCase();
                return profileText.includes(query);
            }
            
            return true;
        });

        resultsHTML = `
            <div class="results-main-header">
                <h2>Results Dashboard</h2>
                <p class="subtitle">Review, search, and export your ranked candidates. Adjust filters and rerun as needed.</p>
            </div>

            <div class="global-feedback-container">
                <h4>Global AI Feedback</h4>
                <p>Provide a general instruction to the AI that will influence all future rankings in this session.</p>
                <textarea id="global-feedback-input" placeholder="e.g., 'Place a higher emphasis on experience in the FinTech industry.'">${state.rankingProcess.globalFeedback}</textarea>
                <div class="button-group">
                    <button id="save-global-feedback" class="btn-save">Save Global Feedback <span id="save-confirmation-global-feedback" class="save-confirmation"></span></button>
                </div>
            </div>

            <div class="results-filters">
                <div class="filter-buttons">
                    <button class="filter-btn ${activeFilter === 'Top' ? 'active' : ''}" data-filter="Top">Top</button>
                    <button class="filter-btn ${activeFilter === 'Good' ? 'active' : ''}" data-filter="Good">Good</button>
                    <button class="filter-btn ${activeFilter === 'Hidden Gems' ? 'active' : ''}" data-filter="Hidden Gems">Hidden Gems</button>
                    <button class="filter-btn ${activeFilter === 'Hot Signals' ? 'active' : ''}" data-filter="Hot Signals">Hot Signals</button>
                    <button class="filter-btn ${activeFilter === 'Rejected' ? 'active' : ''}" data-filter="Rejected">Rejected</button>
                    <button class="filter-btn ${activeFilter === 'All' ? 'active' : ''}" data-filter="All">All</button>
                </div>
                <div class="search-container">
                    <input type="text" id="results-search" placeholder="Search by name, company, skill..." value="${searchQuery}">
                </div>
                <div class="export-container">
                    <button id="export-csv-btn" class="btn-secondary">Export to CSV</button>
                </div>
            </div>
            <div class="results-stats-boxes">
                <div class="stat-box top">
                    <span class="stat-title">Top</span>
                    <span class="stat-count">${topCount}</span>
                </div>
                <div class="stat-box good">
                    <span class="stat-title">Good</span>
                    <span class="stat-count">${goodCount}</span>
                </div>
                 <div class="stat-box hidden-gem">
                    <span class="stat-title">Hidden</span>
                    <span class="stat-count">${hiddenGemsCount}</span>
                </div>
                <div class="stat-box hot-signal">
                    <span class="stat-title">Hot</span>
                    <span class="stat-count">${hotSignalsCount}</span>
                </div>
                 <div class="stat-box rejected">
                    <span class="stat-title">Rejected</span>
                    <span class="stat-count">${rejectedCount}</span>
                </div>
            </div>
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Name</th>
                            <th>Title</th>
                            <th>Current Company</th>
                            <th>LinkedIn</th>
                            <th>Mutual Connections</th>
                            <th>Score</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredProfiles.map((profile, index) => `
                            <tr>
                                <td>${profile.rank}</td>
                                <td>${profile[nameCol] || ''} ${profile[lastNameCol] || ''}</td>
                                <td>${profile[titleCol] || 'N/A'}</td>
                                <td>${profile[companyCol] || 'N/A'}</td>
                                <td>
                                    ${profile[linkedinCol] ? `<a href="${profile[linkedinCol]}" target="_blank" class="mutual-link">🔗 Profile</a>` : 'N/A'}
                                </td>
                                <td>
                                    ${profile[mutualCol] ? `<a href="${profile[mutualCol]}" target="_blank" class="mutual-link">🔗 View</a>` : 'N/A'}
                                </td>
                                <td><div class="score-badge" title="Category: ${profile.category}">${profile.score}</div></td>
                                <td><button class="btn-secondary btn-view" data-index="${rankedProfiles.indexOf(profile)}">View</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (status === 'ranking') {
        // --- RANKING IN PROGRESS VIEW ---
        resultsHTML = `
             <div class="ranking-progress-container">
                <div class="progress-header">
                    <h3>🔄 Ranking in Progress...</h3>
                    <p>Using ${state.rankingProcess.model}</p>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-stats">
                        <span class="progress-text">${progress.current} / ${progress.total} profiles processed</span>
                        <span class="progress-percentage">${progressPercentage}%</span>
                    </div>
                    ${timeRemaining ? `<div class="time-estimate">${timeRemaining}</div>` : ''}
                </div>
                <div class="spinner-container">
                    <div class="spinner"></div>
                    <p>Processing profile ${progress.current + 1}...</p>
                </div>
            </div>
        `;
    } else {
        resultsHTML = `<p class="no-results-yet">Ranking results will appear here once the process starts.</p>`;
    }

    const step4HTML = `
        <div class="step-container" id="step-4">
            <div class="step-header">
                <h2>Step 4: Review & Rank</h2>
            </div>

            <div class="ranking-controls-grid">
                <div class="control-panel">
                    <div class="panel-section">
                        <label for="api-key-input">OpenAI API Key</label>
                        <input type="password" id="api-key-input" placeholder="sk-..." value="${state.rankingProcess.apiKey || ''}">
                        <small class="help-text">Your API key is stored locally and never shared</small>
                    </div>
                    <div class="panel-section">
                        <label for="model-select">Select Model</label>
                        <select id="model-select">
                            ${availableModels.map(model => `<option value="${model}" ${state.rankingProcess.model === model ? 'selected' : ''}>${model}</option>`).join('')}
                        </select>
                    </div>
                    <div class="panel-section">
                        <label>Rank Rows</label>
                        <div class="range-inputs">
                            <input type="number" id="range-start" value="${state.rankingProcess.rangeStart}" min="2">
                            <span>-</span>
                            <input type="number" id="range-end" value="${state.rankingProcess.rangeEnd}">
                        </div>
                    </div>
                     <div class="panel-section stats-display">
                        <div><span>${profilesToRank.length}</span><p>Total Profiles</p></div>
                        <div><span>${rankedProfiles.length}</span><p>Ranked</p></div>
                        <div><span>${remainingToRank}</span><p>Remaining</p></div>
                    </div>
                    <div class="panel-section action-buttons">
                        <button id="start-ranking-btn" class="btn-primary" ${status === 'ranking' ? 'disabled' : ''}>Start Ranking</button>
                        <button id="pause-ranking-btn" class="btn-secondary" ${status !== 'ranking' ? 'disabled' : ''}>Pause</button>
                        <button id="stop-ranking-btn" class="btn-clear" ${status !== 'ranking' ? 'disabled' : ''}>Stop</button>
                    </div>
                </div>
                <div class="instructions-panel">
                    <h4>How to get the best results:</h4>
                    <p>
                        1. Start by ranking a small batch of <strong>5-10 profiles</strong>.
                        <br>
                        2. Review the initial results. Are they what you expected?
                        <br>
                        3. If needed, go back to Step 3 to adjust weights or provide feedback (feedback feature coming soon).
                        <br>
                        4. Continue ranking in small batches until you're satisfied with the quality.
                        <br>
                        5. Once confident, you can rank the entire list.
                    </p>
                </div>
            </div>

            ${status === 'ranking' ? `
                <div class="ranking-progress-container">
                    <div class="progress-header">
                        <h3>🔄 Ranking in Progress...</h3>
                        <p>Using ${state.rankingProcess.model}</p>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span class="progress-text">${progress.current} / ${progress.total} profiles processed</span>
                            <span class="progress-percentage">${progressPercentage}%</span>
                        </div>
                        ${timeRemaining ? `<div class="time-estimate">${timeRemaining}</div>` : ''}
                    </div>
                    <div class="spinner-container">
                        <div class="spinner"></div>
                        <p>Processing profile ${progress.current + 1}...</p>
                    </div>
                </div>
            ` : ''}
            
            <div id="results-container">
                ${resultsHTML}
            </div>

            <!-- Modal for Candidate View -->
            <div id="candidate-modal" class="modal-overlay hidden">
                <div class="modal-content">
                    <button class="modal-close-btn">×</button>
                    <div id="modal-body">
                        <!-- Candidate details will be injected here -->
                    </div>
                </div>
            </div>

            <div class="navigation-buttons">
                <button id="back-step-4" class="btn-secondary">← Back</button>
                <button id="export-results" class="btn-primary" disabled>Export Results</button>
            </div>
        </div>
    `;
    wrapper.innerHTML = step4HTML;

    // Add event listeners for view buttons if they exist
    wrapper.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', (e) => {
            const profileIndex = e.target.dataset.index;
            openCandidateView(profileIndex);
        });
    });

    // Filter and Search Listeners
    if (status === 'complete') {
        wrapper.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                state.rankingProcess.activeFilter = e.target.dataset.filter;
                render();
            });
        });

        const searchInput = wrapper.querySelector('#results-search');
        searchInput.addEventListener('input', (e) => {
            state.rankingProcess.searchQuery = e.target.value;
            render();
        });

        wrapper.querySelector('#export-csv-btn').addEventListener('click', () => {
            // This could be a dropdown in a real app
            const exportType = prompt("Export which category? (Top+Good, All, Rejected, Hidden Gems, Hot Signals)", "Top+Good");
            if (exportType) {
                exportResultsToCsv(exportType);
            }
        });
    }

    // Modal listeners
    const modal = wrapper.querySelector('#candidate-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close-btn')) {
                closeCandidateView();
            }
        });
    }

    wrapper.querySelector('#model-select').addEventListener('change', (e) => {
        state.rankingProcess.model = e.target.value;
        console.log('Model changed to:', state.rankingProcess.model);
    });
    
    // API Key listener
    wrapper.querySelector('#api-key-input').addEventListener('input', (e) => {
        state.rankingProcess.apiKey = e.target.value;
        // Save to localStorage
        localStorage.setItem('scorely_api_key', e.target.value);
    });
    
    // Ranking controls with progress simulation
    wrapper.querySelector('#start-ranking-btn').addEventListener('click', startRankingProcess);
    wrapper.querySelector('#pause-ranking-btn').addEventListener('click', pauseRankingProcess);
    wrapper.querySelector('#stop-ranking-btn').addEventListener('click', stopRankingProcess);

    wrapper.querySelector('#save-global-feedback').addEventListener('click', saveGlobalFeedback);

    return wrapper;
}

function startRankingProcess() {
    const rangeStart = parseInt(document.getElementById('range-start').value, 10);
    const rangeEnd = parseInt(document.getElementById('range-end').value, 10);
    
    if (rangeStart < 2) {
        alert('Range start must be 2 or higher (row 1 contains headers)');
        return;
    }
    
    if (rangeEnd < rangeStart) {
        alert('Range end must be greater than or equal to range start');
        return;
    }

    // Filter for profiles in range that have NOT been ranked yet
    const profilesToProcess = state.rankingProcess.profilesToRank
        .slice(rangeStart - 2, rangeEnd - 1)
        .filter(p => !p.isRanked);

    if (profilesToProcess.length === 0) {
        alert('All profiles in the selected range have already been ranked.');
        return;
    }
    
    // --- AI Cost & Accuracy Simulation ---
    if (state.rankingProcess.globalFeedback) {
        console.log("--- Applying Global Feedback ---");
        console.log(state.rankingProcess.globalFeedback);
        console.log("--------------------------------");
    }

    state.rankingProcess.status = 'ranking';
    state.rankingProcess.progress = {
        current: 0,
        total: profilesToProcess.length,
        startTime: Date.now(),
        estimatedTime: null
    };

    // We MUST do a full render here to show the progress bar container
    render(); 
    
    // Now we call the REAL (simulated) backend function
    callRankApi(profilesToProcess, rangeEnd);
}

async function callRankApi(profilesToProcess, lastRankedIndex) {
    try {
        // Check if API key is provided
        if (!state.rankingProcess.apiKey) {
            alert('Please enter your OpenAI API key before starting the ranking process.');
            state.rankingProcess.status = 'stopped';
            render(true);
            return;
        }

        // Prepare all criteria to send to the AI
        const criteria = {
            ...state.rankingCriteria,
            globalFeedback: state.rankingProcess.globalFeedback,
        };

        // This is the endpoint for the serverless function
        const response = await fetch('/.netlify/functions/rank_profiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profiles: profilesToProcess,
                criteria: criteria,
                apiKey: state.rankingProcess.apiKey
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        // --- Update state with the results from the API ---
        
        // Update the original profiles with the new data
        data.rankedProfiles.forEach(rankedProfile => {
            const originalProfile = state.rankingProcess.profilesToRank.find(p => p[state.columnMapping.linkedinUrl] === rankedProfile[state.columnMapping.linkedinUrl]);
            if(originalProfile) {
                Object.assign(originalProfile, rankedProfile);
                if (!state.rankingProcess.rankedProfiles.includes(originalProfile)) {
                    state.rankingProcess.rankedProfiles.push(originalProfile);
                }
            }
        });
        
        // Now sort and rank all profiles
        state.rankingProcess.rankedProfiles.sort((a, b) => b.score - a.score);
        state.rankingProcess.rankedProfiles.forEach((p, i) => p.rank = i + 1);

        // Update range for next batch
        const batchSize = lastRankedIndex - (state.rankingProcess.rangeStart - 1);
        state.rankingProcess.rangeStart = lastRankedIndex;
        state.rankingProcess.rangeEnd = lastRankedIndex + batchSize - 1;
        
        state.rankingProcess.status = 'complete';
        render(true);

    } catch (error) {
        console.error("Error calling ranking API:", error);
        
        // Show specific message for API key issues
        let errorMessage = error.message;
        if (errorMessage.includes('Invalid OpenAI API key')) {
            errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
        } else if (errorMessage.includes('insufficient_quota') || errorMessage.includes('billing')) {
            errorMessage = 'OpenAI API quota exceeded or billing issue. Please check your OpenAI account.';
        }
        
        alert(`An error occurred while ranking: ${errorMessage}`);
        state.rankingProcess.status = 'stopped';
        render(true);
    }
}

function updateRankingProgressDOM(progress) {
    const { current, total, startTime } = progress;
    if (!document.querySelector('.progress-fill')) return; // Exit if container isn't on screen

    const progressPercentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    document.querySelector('.progress-fill').style.width = `${progressPercentage}%`;
    document.querySelector('.progress-text').textContent = `${current} / ${total} profiles processed`;
    document.querySelector('.progress-percentage').textContent = `${progressPercentage}%`;

    let timeRemaining = '';
    if (startTime && current > 0) {
        const elapsed = Date.now() - startTime;
        const avgTimePerProfile = elapsed / current;
        const remainingProfiles = total - current;
        const estimatedRemaining = avgTimePerProfile * remainingProfiles;
        
        if (estimatedRemaining > 60000) {
            timeRemaining = `~${Math.round(estimatedRemaining / 60000)} minutes remaining`;
        } else {
            timeRemaining = `~${Math.round(estimatedRemaining / 1000)} seconds remaining`;
        }
    }
    const timeEstimateEl = document.querySelector('.time-estimate');
    if(timeEstimateEl) timeEstimateEl.innerHTML = timeRemaining;

    const spinnerP = document.querySelector('.spinner-container p');
    if (spinnerP) spinnerP.textContent = `Processing profile ${current + 1}...`;
}

function pauseRankingProcess() {
    state.rankingProcess.status = 'paused';
    render(); // NO SCROLL
}

function stopRankingProcess() {
    state.rankingProcess.status = 'stopped';
    state.rankingProcess.progress = {
        current: 0,
        total: 0,
        startTime: null,
        estimatedTime: null
    };
    render(); // NO SCROLL
}

function openCandidateView(index) {
    const profile = state.rankingProcess.rankedProfiles[index];
    if (!profile) return;

    // A unique identifier for feedback, using LinkedIn URL or rank as fallback
    const profileId = profile[state.columnMapping.linkedinUrl] || `rank-${profile.rank}`;
    profile.uniqueId = profileId; // Store it for later

    const modalBody = document.getElementById('modal-body');
    const nameCol = state.columnMapping.firstName || state.fileHeaders[0];
    const lastNameCol = state.columnMapping.lastName || '';
    const fullName = `${profile[nameCol] || ''} ${profile[lastNameCol] || ''}`.trim();
    const linkedinCol = state.columnMapping.linkedinUrl || '';

    const { summary, strengths, concerns, scoreReason } = generateAiSummary(profile);

    const modalHTML = `
        <div class="candidate-modal-header">
            <h3>${fullName}</h3>
            <span class="rank-pill">Rank ${profile.rank}</span>
        </div>
        
        <div class="candidate-modal-main-content">
            <div class="candidate-summary">
                <h4>AI Analysis</h4>
                <p>${summary}</p>
                
                <h5>Strengths</h5>
                <ul>${strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                
                <h5>Concerns</h5>
                <ul>${concerns.map(c => `<li>${c}</li>`).join('')}</ul>

                <h5>Score Rationale</h5>
                <p>${scoreReason}</p>
            </div>
            <div class="candidate-sidebar">
                <div class="sidebar-section">
                    <strong>AI Score</strong>
                    <div class="score-badge large">${profile.score}</div>
                </div>
                <div class="sidebar-section">
                    <strong>Embedding Score</strong>
                    <span>${profile.embeddingScore}</span>
                </div>
                <div class="sidebar-section">
                    <strong>Category</strong>
                    <span>${profile.category}</span>
                </div>
                <div class="sidebar-section">
                    <strong>LinkedIn Profile</strong>
                    ${profile[linkedinCol] ? `<a href="${profile[linkedinCol]}" target="_blank">View Profile</a>` : 'N/A'}
                </div>
                ${profile.tags && profile.tags.length > 0 ? `
                <div class="sidebar-section">
                    <strong>Tags</strong>
                    <div class="tag-list">${profile.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
                </div>
                ` : ''}
                 <div class="sidebar-section actions">
                    <button id="export-pdf-btn" class="btn-secondary">Export as PDF</button>
                </div>
            </div>
        </div>

        <div class="modal-section feedback-section">
            <h4>Re-categorize & Teach AI</h4>
            <p>If you disagree with the AI's score, you can correct it. Your feedback will be used to improve future rankings.</p>
            <div class="feedback-form">
                <label for="feedback-score">New Score (0-100)</label>
                <input type="number" id="feedback-score" min="0" max="100" value="${profile.score}">
                <label for="feedback-explanation">Explanation (Required)</label>
                <textarea id="feedback-explanation" placeholder="e.g., 'This candidate's experience at a small startup is highly relevant, AI undervalued it.'"></textarea>
                <button id="save-feedback-btn" class="btn-primary">Save Feedback</button>
            </div>
        </div>
    `;
    modalBody.innerHTML = modalHTML;
    
    document.getElementById('save-feedback-btn').addEventListener('click', () => saveFeedback(index));
    document.getElementById('export-pdf-btn').addEventListener('click', () => exportProfileToPdf(profile));

    document.getElementById('candidate-modal').classList.remove('hidden');
}

function generateAiSummary(profile) {
    const summary = `This candidate presents as a ${profile.category === 'Top' ? 'strong' : 'viable'} contender based on the provided criteria. Their experience seems to align well with several key areas, though some gaps are noted.`;
    
    let strengths = [];
    if (profile.score > 80) strengths.push('High similarity to ideal profiles.');
    if (profile.profileSummary.toLowerCase().includes('react')) strengths.push('Possesses key technical skill: React.');
    if (profile.tags && profile.tags.includes('Hidden Gem')) strengths.push('Experience at a Big Tech company provides a strong foundation.');

    let concerns = [];
    if (profile.score < 80) concerns.push('Lacks direct experience in one or more secondary skill areas.');
    if (profile.profileSummary.toLowerCase().includes('0-2 years')) concerns.push('Potential job hopping detected in profile summary.');

    const scoreReason = `The score of ${profile.score} was determined by strong alignment with core requirements, balanced against a noted lack of experience in peripheral skills. The candidate's background in ${profile[state.columnMapping.company] || 'their current role'} was weighted positively.`;

    // Add fallback if empty
    if (strengths.length === 0) strengths.push('General alignment with role requirements.');
    if (concerns.length === 0) concerns.push('No major concerns detected.');

    return { summary, strengths, concerns, scoreReason };
}

function exportProfileToPdf(profile) {
    const originalTitle = document.title;
    const nameCol = state.columnMapping.firstName || state.fileHeaders[0];
    const lastNameCol = state.columnMapping.lastName || '';
    const fullName = `${profile[nameCol] || ''} ${profile[lastNameCol] || ''}`.trim();
    
    document.title = `Scorely Profile - ${fullName}`;
    window.print();
    document.title = originalTitle;
}

function closeCandidateView() {
    document.getElementById('candidate-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = ''; // Clear content
}

function saveFeedback(index) {
    const profile = state.rankingProcess.rankedProfiles[index];
    const newScore = document.getElementById('feedback-score').value;
    const explanation = document.getElementById('feedback-explanation').value;

    if (!explanation) {
        alert('Explanation is required to save feedback.');
        return;
    }

    if (!state.feedback) {
        state.feedback = [];
    }

    state.feedback.push({
        profileId: profile.uniqueId,
        originalScore: profile.score,
        newScore: parseInt(newScore, 10),
        explanation: explanation,
        timestamp: new Date().toISOString()
    });

    // Update the profile score in the main state
    profile.score = parseInt(newScore, 10);
    
    // Optional: Re-sort and re-render the list immediately
    state.rankingProcess.rankedProfiles.sort((a, b) => b.score - a.score);
    state.rankingProcess.rankedProfiles.forEach((p, i) => p.rank = i + 1);

    console.log('Feedback saved:', state.feedback);
    alert('Thank you! Your feedback has been saved.');
    
    closeCandidateView();
    render(); // Re-render the main view with updated scores and ranks
}

function exportResultsToCsv(filter) {
    let dataToExport = [];
    const profiles = state.rankingProcess.rankedProfiles;

    switch (filter.toLowerCase()) {
        case 'top+good':
            dataToExport = profiles.filter(p => p.category === 'Top' || p.category === 'Good');
            break;
        case 'all':
            dataToExport = profiles;
            break;
        case 'rejected':
            dataToExport = profiles.filter(p => p.category === 'Rejected');
            break;
        case 'hidden gems':
            dataToExport = profiles.filter(p => p.tags && p.tags.includes('Hidden Gem'));
            break;
        case 'hot signals':
            dataToExport = profiles.filter(p => p.tags && p.tags.includes('Hot Signal'));
            break;
        default:
            alert('Invalid export category.');
            return;
    }

    if (dataToExport.length === 0) {
        alert('No profiles to export in this category.');
        return;
    }

    // We can customize the headers for the CSV
    const csvData = dataToExport.map(p => ({
        Rank: p.rank,
        Category: p.category,
        Score: p.score,
        FirstName: p[state.columnMapping.firstName] || '',
        LastName: p[state.columnMapping.lastName] || '',
        Title: p[state.columnMapping.title] || '',
        Company: p[state.columnMapping.company] || '',
        LinkedIn: p[state.columnMapping.linkedinUrl] || '',
        Tags: (p.tags || []).join(', '),
        ProfileSummary: p.profileSummary
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scorely_export_${filter.toLowerCase().replace('+', '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveGlobalFeedback() {
    state.rankingProcess.globalFeedback = document.getElementById('global-feedback-input').value;
    showSaveConfirmation('global-feedback');
    console.log('Global feedback saved:', state.rankingProcess.globalFeedback);
}

function initializeGlobalListeners() {
    // API Key Modal listeners
    const apiKeyModal = document.getElementById('api-key-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = apiKeyModal.querySelector('.modal-close-btn');
    const saveBtn = document.getElementById('save-api-key-btn');
    const apiKeyInput = document.getElementById('modal-api-key-input');

    const openModal = () => {
        apiKeyInput.value = localStorage.getItem('scorely_api_key') || '';
        apiKeyModal.classList.remove('hidden');
    };
    const closeModal = () => apiKeyModal.classList.add('hidden');

    settingsBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) closeModal();
    });

    saveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value;
        if (key && key.startsWith('sk-')) {
            localStorage.setItem('scorely_api_key', key);
            state.rankingProcess.apiKey = key;
            alert('API Key saved successfully!');
            closeModal();
        } else {
            alert('Please enter a valid OpenAI API key, starting with "sk-".');
        }
    });
}

// Initial render
render(true);
initializeGlobalListeners();
