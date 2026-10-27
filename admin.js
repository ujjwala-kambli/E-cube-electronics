/* =====================================================
   E-CUBE PCB ADMIN DASHBOARD
   FULL QUOTE MANAGEMENT
   Backend: PUT /api/quotes/:id
===================================================== */

const BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:")
    ? "http://localhost:5000"
    : "https://e-cube-backend.onrender.com";

const API_URL = BASE_URL + "/api/quotes";

/* =====================================================
   ADMIN CREDENTIALS & SECURITY CONFIG
   (तुम्ही तुमचा Password खाली बदलू शकता!)
===================================================== */
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin12345" // <-- येथे तुम्ही तुमचा पासवर्ड बदलू शकता
};

// =====================================================
// ATTACH ADMIN SECURITY HEADER TO ALL API REQUESTS
// =====================================================
const _nativeFetch = window.fetch;
window.fetch = function (url, options = {}) {
    options = options || {};
    options.headers = options.headers || {};
    const key = ADMIN_CREDENTIALS.password;
    if (options.headers instanceof Headers) {
        options.headers.set("x-admin-key", key);
    } else {
        options.headers["x-admin-key"] = key;
    }
    return _nativeFetch(url, options);
};

let allQuotes = [];

let editingQuote = null;


// =====================================================
// AUTHENTICATION HANDLERS
// =====================================================

function checkAdminAuth() {
    const isLoggedIn = sessionStorage.getItem("ecube_admin_logged_in") === "true";
    const overlay = document.getElementById("adminLoginOverlay");
    const displayUser = document.getElementById("displayAdminUser");

    if (isLoggedIn) {
        if (overlay) overlay.style.display = "none";
        document.body.classList.remove("modal-open");
        const savedUser = sessionStorage.getItem("ecube_admin_user") || ADMIN_CREDENTIALS.username;
        if (displayUser) displayUser.textContent = savedUser;
        return true;
    } else {
        if (overlay) overlay.style.display = "flex";
        document.body.classList.add("modal-open");
        return false;
    }
}

function handleAdminLogin(event) {
    if (event) event.preventDefault();
    const userInput = document.getElementById("adminAuthUsername")?.value.trim();
    const passInput = document.getElementById("adminAuthPassword")?.value;
    const errorEl = document.getElementById("adminLoginError");

    if (userInput === ADMIN_CREDENTIALS.username && passInput === ADMIN_CREDENTIALS.password) {
        if (errorEl) errorEl.style.display = "none";
        sessionStorage.setItem("ecube_admin_logged_in", "true");
        sessionStorage.setItem("ecube_admin_user", userInput);

        const overlay = document.getElementById("adminLoginOverlay");
        if (overlay) overlay.style.display = "none";
        document.body.classList.remove("modal-open");

        const displayUser = document.getElementById("displayAdminUser");
        if (displayUser) displayUser.textContent = userInput;

        showToast("Welcome to Admin Dashboard!", "success");

        // Load dashboard data on login
        loadQuotes();
        loadAdminPricingSettings();
    } else {
        if (errorEl) {
            errorEl.textContent = "Invalid username or password. Please try again.";
            errorEl.style.display = "block";
        }
        const passField = document.getElementById("adminAuthPassword");
        if (passField) {
            passField.value = "";
            passField.focus();
        }
    }
}

function handleAdminLogout() {
    if (confirm("Are you sure you want to log out of Admin Dashboard?")) {
        sessionStorage.removeItem("ecube_admin_logged_in");
        sessionStorage.removeItem("ecube_admin_user");
        window.location.reload();
    }
}

function toggleAdminPasswordVisibility() {
    const passInput = document.getElementById("adminAuthPassword");
    const eyeIcon = document.getElementById("toggleAdminPassBtn");
    if (!passInput || !eyeIcon) return;

    if (passInput.type === "password") {
        passInput.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
    } else {
        passInput.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
    }
}


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const isAuth = checkAdminAuth();
    if (isAuth) {
        loadQuotes();
        loadAdminPricingSettings();
    }
    setupEditForm();

    // Sidebar navigation active state handler
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", function () {
            menuItems.forEach(m => m.classList.remove("active"));
            this.classList.add("active");
        });
    });

});


// =====================================================
// LOAD ALL QUOTES
// =====================================================

async function loadQuotes() {

    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        allQuotes = Array.isArray(data)
            ? data
            : (data.quotes || []);

        renderQuotes();
        updateDashboard();
        renderCustomers();

    } catch (error) {

        console.error("LOAD QUOTES ERROR:", error);

        const table = document.getElementById("quotesTable");

        if (table) {

            table.innerHTML = `
                <tr>
                    <td colspan="9" class="error-cell">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <br>
                        Unable to load quotes.
                        <br>
                        Please make sure backend is running.
                    </td>
                </tr>
            `;

        }

    }

}


// =====================================================
// RENDER QUOTES
// =====================================================

function renderQuotes() {

    const table = document.getElementById("quotesTable");
    const emptyState = document.getElementById("emptyState");

    if (!table) return;

    const search =
        (document.getElementById("searchInput")?.value || "")
            .toLowerCase()
            .trim();

    const selectedStatus =
        document.getElementById("statusFilter")?.value || "all";


    const filteredQuotes = allQuotes.filter(quote => {

        const email =
            String(quote.email || "").toLowerCase();

        const phone =
            String(quote.phone || "").toLowerCase();

        const pcbName =
            String(quote.pcb_name || "").toLowerCase();

        const status =
            String(quote.status || "Pending");


        const searchMatch =
            email.includes(search) ||
            phone.includes(search) ||
            pcbName.includes(search);


        const statusMatch =
            selectedStatus === "all" ||
            status.toLowerCase() === selectedStatus.toLowerCase();


        return searchMatch && statusMatch;

    });


    table.innerHTML = "";


    if (!filteredQuotes.length) {

        if (emptyState) {
            emptyState.style.display = "block";
        }

        return;

    }


    if (emptyState) {
        emptyState.style.display = "none";
    }


    filteredQuotes.forEach((quote, index) => {

        const row = document.createElement("tr");


        const deliveryDate =
            formatDate(quote.delivery_date);


        const finalTotal =
            Number(quote.final_total || 0);


        const status =
            quote.status || "Pending";


        const statusClass =
            status.toLowerCase();


        let gerberHTML = `
            <span class="no-file">
                No File
            </span>
        `;


        if (quote.gerber_file) {

            gerberHTML = `
                <a
                    href="${getGerberURL(quote.gerber_file)}"
                    target="_blank"
                    class="gerber-btn"
                >
                    <i class="fa-solid fa-file-zipper"></i>
                    View File
                </a>
            `;

        }


        row.innerHTML = `

            <td>
                ${index + 1}
            </td>


            <td>

                <div class="customer-cell">

                    <strong>
                        ${escapeHTML(quote.email || "-")}
                    </strong>

                    <small>
                        ${escapeHTML(quote.phone || "-")}
                    </small>

                </div>

            </td>


            <td>

                <input
                    type="text"
                    class="admin-id-input"
                    style="width: 120px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"
                    value="${escapeHTML(quote.internal_order_code || "")}"
                    onblur="updateAdminId(${quote.id}, this.value)"
                    placeholder="Admin ID"
                >

            </td>


            <td>

                <span class="order-type-badge ${String(quote.order_type || 'New').toLowerCase()}">
                    ${escapeHTML(quote.order_type || "New")}
                </span>

            </td>


            <td>

                <div class="pcb-details">

                    <strong>
                        ${escapeHTML(quote.pcb_name || "-")}
                    </strong>

                    <small>
                        Size:
                        ${escapeHTML(
            quote.width ?? "-"
        )}
                        ×
                        ${escapeHTML(
            quote.height ?? "-"
        )}
                        mm
                    </small>

                    <small>
                        Material:
                        ${escapeHTML(
            quote.base_material || "-"
        )}
                    </small>

                    <small>
                        Layers:
                        ${escapeHTML(
            quote.layers || "-"
        )}
                    </small>

                </div>

            </td>


            <td>
                ${deliveryDate}
            </td>


            <td>

                <strong
                    style="
                        display: block;
                        padding-left: 10px;
                        text-align: right;
                    "
                >
                    ${escapeHTML(
            quote.quantity || "-"
        )}
                </strong>

            </td>


            <td>
                ${gerberHTML}
            </td>


            <td>

                <strong class="price">
                    ₹${finalTotal.toFixed(2)}
                </strong>

            </td>


            <td>

                <select
                    class="status-select ${statusClass}"
                    onchange="changeStatus(${quote.id}, this.value)"
                >

                    <option
                        value="Pending"
                        ${status === "Pending" ? "selected" : ""}
                    >
                        Pending
                    </option>


                    <option
                        value="Processing"
                        ${status === "Processing" ? "selected" : ""}
                    >
                        Processing
                    </option>


                    <option
                        value="Completed"
                        ${status === "Completed" ? "selected" : ""}
                    >
                        Completed
                    </option>


                    <option
                        value="Cancelled"
                        ${status === "Cancelled" ? "selected" : ""}
                    >
                        Cancelled
                    </option>

                </select>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="edit-btn"
                        title="Edit Quote"
                        onclick="openEditModal(${quote.id})"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>


                    <button
                        class="delete-btn"
                        title="Delete Quote"
                        onclick="deleteQuote(${quote.id})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </td>

        `;


        table.appendChild(row);

    });

}


// =====================================================
// DASHBOARD STATS
// =====================================================

function updateDashboard() {

    const totalQuotes = allQuotes.length;


    const customerEmails =
        new Set(
            allQuotes
                .map(q => q.email)
                .filter(Boolean)
        );


    const pending =
        allQuotes.filter(
            q => (q.status || "Pending") === "Pending"
        ).length;


    const totalValue =
        allQuotes.reduce(
            (sum, quote) =>
                sum + Number(
                    quote.final_total || 0
                ),
            0
        );


    setText(
        "totalQuotes",
        totalQuotes
    );


    setText(
        "totalCustomers",
        customerEmails.size
    );


    setText(
        "pendingQuotes",
        pending
    );


    setText(
        "totalValue",
        `₹${totalValue.toFixed(2)}`
    );

}


// =====================================================
// CUSTOMER LIST
// =====================================================

function renderCustomers() {

    const grid =
        document.getElementById(
            "customerGrid"
        );

    if (!grid) return;

    grid.innerHTML = "";


    const customers = {};


    allQuotes.forEach(quote => {

        const email =
            quote.email || "Unknown";


        if (!customers[email]) {

            customers[email] = {

                name:
                    quote.customer_name ||
                    "Customer",

                email,

                phone:
                    quote.phone ||
                    "-",

                quotes:
                    0,

                totalValue:
                    0

            };

        }


        customers[email].quotes += 1;


        customers[email].totalValue +=
            Number(
                quote.final_total ||
                0
            );

    });


    Object.values(customers)
        .forEach(customer => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "customer-card";


            card.innerHTML = `

                <div class="customer-icon">

                    <i class="fa-solid fa-user"></i>

                </div>


                <div class="customer-info">

                    <h3>
                        ${escapeHTML(
                customer.name
            )}
                    </h3>


                    <p>
                        ${escapeHTML(
                customer.email
            )}
                    </p>


                    <p>
                        ${escapeHTML(
                customer.phone
            )}
                    </p>


                    <small>

                        ${customer.quotes}
                        Quote(s)

                        &nbsp; • &nbsp;

                        ₹${customer.totalValue.toFixed(2)}

                    </small>

                </div>

            `;


            grid.appendChild(card);

        });

}


// =====================================================
// OPEN EDIT MODAL
// =====================================================

function openEditModal(id) {

    const quote =
        allQuotes.find(
            q =>
                Number(q.id) ===
                Number(id)
        );


    if (!quote) {

        alert(
            "Quote not found."
        );

        return;

    }


    editingQuote =
        quote;


    // -------------------------------------------------
    // BASIC
    // -------------------------------------------------

    setValue(
        "editId",
        quote.id
    );


    // -------------------------------------------------
    // CUSTOMER
    // -------------------------------------------------

    setValue(
        "editCustomerName",
        quote.customer_name ||
        "Customer"
    );


    setValue(
        "editEmail",
        quote.email ||
        ""
    );


    setValue(
        "editPhone",
        quote.phone ||
        ""
    );


    // -------------------------------------------------
    // PCB
    // -------------------------------------------------

    setValue(
        "editPcbName",
        quote.pcb_name ||
        ""
    );


    setValue(
        "editDispatch",
        quote.dispatch_unit ||
        "PCB"
    );


    // Width
    setValue(
        "editWidth",
        quote.width ??
        ""
    );


    // Height
    setValue(
        "editHeight",
        quote.height ??
        ""
    );


    setValue(
        "editQuantity",
        quote.quantity ||
        1
    );


    setValue(
        "editBaseMaterial",
        quote.base_material ||
        "FR-4"
    );


    setValue(
        "editLayers",
        quote.layers ||
        "2 Layers"
    );


    setValue(
        "editThickness",
        quote.thickness ||
        "1.6 mm"
    );


    setValue(
        "editCopperFinish",
        quote.copper_finish ||
        "35 Micron"
    );


    setValue(
        "editMaskColor",
        quote.mask_color ||
        "Green"
    );


    setValue(
        "editSurfaceFinish",
        quote.surface_finish ||
        "Roller Tin"
    );


    setValue(
        "editSilkScreen",
        quote.silk_screen ||
        "White"
    );


    // -------------------------------------------------
    // GERBER
    // -------------------------------------------------

    const gerberName =
        document.getElementById(
            "gerberFileName"
        );


    if (gerberName) {

        gerberName.textContent =
            quote.gerber_file
                ? getOriginalDisplayName(
                    quote.gerber_file
                )
                : "No file";

    }


    const gerberView =
        document.getElementById(
            "editGerberView"
        );


    if (gerberView) {

        gerberView.href =
            quote.gerber_file
                ? getGerberURL(
                    quote.gerber_file
                )
                : "#";

    }


    const gerberHidden =
        document.getElementById(
            "editGerberFile"
        );


    if (gerberHidden) {

        gerberHidden.value =
            quote.gerber_file ||
            "";

    }


    // -------------------------------------------------
    // THREE DELIVERY DATES
    // -------------------------------------------------

    setValue(
        "editDate1",
        normalizeDateForInput(
            quote.delivery_date_1 ||
            quote.date_option_1 ||
            ""
        )
    );


    setValue(
        "editDate2",
        normalizeDateForInput(
            quote.delivery_date_2 ||
            quote.date_option_2 ||
            ""
        )
    );


    setValue(
        "editDate3",
        normalizeDateForInput(
            quote.delivery_date_3 ||
            quote.date_option_3 ||
            ""
        )
    );


    // Selected customer's actual delivery date
    setValue(
        "editDeliveryDate",
        normalizeDateForInput(
            quote.delivery_date
        )
    );


    // -------------------------------------------------
    // PRICE SUMMARY
    // -------------------------------------------------

    setValue(
        "editBasicPrice",
        quote.basic_price ??
        0
    );


    setValue(
        "editSetupCost",
        quote.setup_cost ??
        0
    );


    setValue(
        "editFptCost",
        quote.fpt_cost ??
        quote.fpt ??
        0
    );


    setValue(
        "editGST",
        quote.gst ??
        0
    );


    setValue(
        "editFinalTotal",
        quote.final_total ??
        0
    );


    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    setValue(
        "editStatus",
        quote.status ||
        "Pending"
    );


    // -------------------------------------------------
    // ADMIN NOTE & ADMIN ID
    // -------------------------------------------------

    setValue(
        "editAdminId",
        quote.internal_order_code ||
        ""
    );

    setValue(
        "editAdminNote",
        quote.admin_note ||
        ""
    );


    // -------------------------------------------------
    // OPEN MODAL
    // -------------------------------------------------

    const modal =
        document.getElementById(
            "editModal"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );


        document.body.classList.add(
            "modal-open"
        );

    }

}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeEditModal() {

    const modal =
        document.getElementById(
            "editModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }


    document.body.classList.remove(
        "modal-open"
    );


    editingQuote =
        null;

}


// =====================================================
// SETUP EDIT FORM
// =====================================================

function setupEditForm() {

    const form =
        document.getElementById(
            "editForm"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                document.getElementById(
                    "editId"
                ).value;


            if (!id) {

                alert(
                    "Quote ID missing."
                );

                return;

            }


            const original =
                allQuotes.find(
                    q =>
                        Number(q.id) ===
                        Number(id)
                );


            if (!original) {

                alert(
                    "Original quote not found."
                );

                return;

            }


            // -------------------------------------------------
            // WIDTH / HEIGHT
            // -------------------------------------------------

            const width =
                Number(
                    getValue(
                        "editWidth"
                    ) || 0
                );


            const height =
                Number(
                    getValue(
                        "editHeight"
                    ) || 0
                );


            if (
                !Number.isFinite(width) ||
                width <= 0
            ) {

                alert(
                    "Please enter a valid PCB width."
                );

                return;

            }


            if (
                !Number.isFinite(height) ||
                height <= 0
            ) {

                alert(
                    "Please enter a valid PCB height."
                );

                return;

            }


            // -------------------------------------------------
            // QUANTITY
            // -------------------------------------------------

            const quantity =
                Number(
                    getValue(
                        "editQuantity"
                    ) || 1
                );


            if (
                !Number.isFinite(quantity) ||
                quantity < 1 ||
                quantity > 500
            ) {

                alert(
                    "Quantity must be between 1 and 500."
                );

                return;

            }


            // -------------------------------------------------
            // THREE DELIVERY DATES
            // -------------------------------------------------

            const date1 =
                getValue(
                    "editDate1"
                );


            const date2 =
                getValue(
                    "editDate2"
                );


            const date3 =
                getValue(
                    "editDate3"
                );


            // -------------------------------------------------
            // SELECTED DELIVERY DATE
            // -------------------------------------------------

            const deliveryDate =
                getValue(
                    "editDeliveryDate"
                ) ||
                normalizeDateForInput(
                    original.delivery_date
                );


            // -------------------------------------------------
            // PRICE VALUES
            // -------------------------------------------------

            const basicPrice =
                Number(
                    getValue(
                        "editBasicPrice"
                    ) || 0
                );


            const setupCost =
                Number(
                    getValue(
                        "editSetupCost"
                    ) || 0
                );


            const fptCost =
                Number(
                    getValue(
                        "editFptCost"
                    ) ||
                    original.fpt_cost ||
                    original.fpt ||
                    0
                );


            const gst =
                Number(
                    getValue(
                        "editGST"
                    ) || 0
                );


            const finalTotal =
                Number(
                    getValue(
                        "editFinalTotal"
                    ) || 0
                );


            if (
                basicPrice < 0 ||
                setupCost < 0 ||
                fptCost < 0 ||
                gst < 0 ||
                finalTotal < 0
            ) {

                alert(
                    "Price values cannot be negative."
                );

                return;

            }


            // -------------------------------------------------
            // UPDATE DATA
            // -------------------------------------------------

            const updateData = {

                // Admin ID
                internal_order_code:
                    (document.getElementById("editAdminId")
                        ? getValue("editAdminId")
                        : original.internal_order_code) ||
                    null,


                // Customer
                customer_name:
                    getValue(
                        "editCustomerName"
                    ) ||
                    original.customer_name ||
                    "Customer",


                email:
                    getValue(
                        "editEmail"
                    ) ||
                    original.email ||
                    "",


                phone:
                    getValue(
                        "editPhone"
                    ) ||
                    original.phone ||
                    "",


                // PCB
                pcb_name:
                    getValue(
                        "editPcbName"
                    ) ||
                    original.pcb_name ||
                    "",


                dispatch_unit:
                    getValue(
                        "editDispatch"
                    ) ||
                    original.dispatch_unit ||
                    "PCB",


                width:
                    width,


                height:
                    height,


                quantity:
                    quantity,


                base_material:
                    getValue(
                        "editBaseMaterial"
                    ) ||
                    original.base_material ||
                    "FR-4",


                layers:
                    getValue(
                        "editLayers"
                    ) ||
                    original.layers ||
                    "2 Layers",


                thickness:
                    getValue(
                        "editThickness"
                    ) ||
                    original.thickness ||
                    "1.6 mm",


                copper_finish:
                    getValue(
                        "editCopperFinish"
                    ) ||
                    original.copper_finish ||
                    "35 Micron",


                mask_color:
                    getValue(
                        "editMaskColor"
                    ) ||
                    original.mask_color ||
                    "Green",


                surface_finish:
                    getValue(
                        "editSurfaceFinish"
                    ) ||
                    original.surface_finish ||
                    "Roller Tin",


                silk_screen:
                    getValue(
                        "editSilkScreen"
                    ) ||
                    original.silk_screen ||
                    "White",


                // Gerber unchanged
                gerber_file:
                    original.gerber_file ||
                    null,


                // Selected delivery date
                delivery_date:
                    deliveryDate,


                // Three delivery options
                delivery_date_1:
                    date1 ||
                    null,


                delivery_date_2:
                    date2 ||
                    null,


                delivery_date_3:
                    date3 ||
                    null,


                // Price summary
                basic_price:
                    basicPrice,


                setup_cost:
                    setupCost,


                fpt_cost:
                    fptCost,


                gst:
                    gst,


                final_total:
                    finalTotal,


                // Status
                status:
                    getValue(
                        "editStatus"
                    ) ||
                    original.status ||
                    "Pending",


                // Admin note
                admin_note:
                    getValue(
                        "editAdminNote"
                    ) ||
                    null

            };


            try {

                showSavingState(
                    true
                );


                const response =
                    await fetch(
                        `${API_URL}/${id}`,
                        {

                            method:
                                "PUT",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    updateData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Unable to update quote."
                    );

                }


                // -------------------------------------------------
                // UPDATE LOCAL DATA
                // -------------------------------------------------

                if (data.quote) {

                    const index =
                        allQuotes.findIndex(
                            q =>
                                Number(q.id) ===
                                Number(id)
                        );


                    if (index !== -1) {

                        allQuotes[index] =
                            data.quote;

                    }

                }


                // -------------------------------------------------
                // REFRESH
                // -------------------------------------------------

                closeEditModal();

                renderQuotes();

                updateDashboard();

                renderCustomers();


                // Reload actual DB data
                await loadQuotes();


                showToast(
                    "Quote updated successfully.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "UPDATE QUOTE ERROR:",
                    error
                );


                showToast(
                    error.message ||
                    "Unable to update quote.",
                    "error"
                );


            } finally {

                showSavingState(
                    false
                );

            }

        }
    );

}


// =====================================================
// CHANGE STATUS
// =====================================================

async function changeStatus(
    id,
    status
) {

    /*
       Existing status functionality preserved.
       Do not change the working status behaviour.
    */

    const quote =
        allQuotes.find(
            q =>
                Number(q.id) ===
                Number(id)
        );


    if (!quote) {

        alert(
            "Quote not found."
        );

        return;

    }


    try {

        const updateData = {

            customer_name:
                quote.customer_name ||
                "Customer",

            email:
                quote.email ||
                "",

            phone:
                quote.phone ||
                "",

            pcb_name:
                quote.pcb_name ||
                "",

            width:
                Number(
                    quote.width ||
                    20
                ),

            height:
                Number(
                    quote.height ||
                    20
                ),

            quantity:
                Number(
                    quote.quantity ||
                    1
                ),

            dispatch_unit:
                quote.dispatch_unit ||
                "PCB",

            base_material:
                quote.base_material ||
                "FR-4",

            layers:
                quote.layers ||
                "2 Layers",

            thickness:
                quote.thickness ||
                "1.6 mm",

            copper_finish:
                quote.copper_finish ||
                "35 Micron",

            mask_color:
                quote.mask_color ||
                "Green",

            surface_finish:
                quote.surface_finish ||
                "Roller Tin",

            silk_screen:
                quote.silk_screen ||
                "White",


            // Existing Gerber
            gerber_file:
                quote.gerber_file ||
                null,


            delivery_date:
                normalizeDateForInput(
                    quote.delivery_date
                ),

            delivery_date_1:
                normalizeDateForInput(
                    quote.delivery_date_1 ||
                    quote.date_option_1
                ) || null,

            delivery_date_2:
                normalizeDateForInput(
                    quote.delivery_date_2 ||
                    quote.date_option_2
                ) || null,

            delivery_date_3:
                normalizeDateForInput(
                    quote.delivery_date_3 ||
                    quote.date_option_3
                ) || null,

            basic_price:
                Number(
                    quote.basic_price ||
                    0
                ),

            setup_cost:
                Number(
                    quote.setup_cost ||
                    0
                ),

            fpt_cost:
                Number(
                    quote.fpt_cost ||
                    quote.fpt ||
                    0
                ),

            gst:
                Number(
                    quote.gst ||
                    0
                ),

            final_total:
                Number(
                    quote.final_total ||
                    0
                ),

            status:
                status,

            admin_note:
                quote.admin_note ||
                null,

            internal_order_code:
                quote.internal_order_code ||
                null
        };


        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method:
                        "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            updateData
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Status update failed."
            );

        }


        const index =
            allQuotes.findIndex(
                q =>
                    Number(q.id) ===
                    Number(id)
            );


        if (index !== -1) {

            if (data.quote) {

                allQuotes[index] =
                    data.quote;

            } else {

                allQuotes[index].status =
                    status;

            }

        }


        renderQuotes();

        updateDashboard();

        renderCustomers();


        await loadQuotes();


        showToast(
            `Status changed to ${status}.`,
            "success"
        );


    } catch (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );


        await loadQuotes();


        showToast(
            error.message ||
            "Unable to update status.",
            "error"
        );

    }

}


// =====================================================
// UPDATE ADMIN ID
// =====================================================

async function updateAdminId(
    id,
    adminId
) {

    const quote =
        allQuotes.find(
            q =>
                Number(q.id) ===
                Number(id)
        );


    if (!quote) {

        return;

    }


    const normalizedAdminId =
        String(
            adminId ||
            ""
        ).trim();


    try {

        const updateData = {

            internal_order_code:
                normalizedAdminId ||
                null,


            customer_name:
                quote.customer_name ||
                "Customer",


            email:
                quote.email ||
                "",


            phone:
                quote.phone ||
                "",


            pcb_name:
                quote.pcb_name ||
                "",


            width:
                Number(
                    quote.width ||
                    20
                ),


            height:
                Number(
                    quote.height ||
                    20
                ),


            quantity:
                Number(
                    quote.quantity ||
                    1
                ),


            dispatch_unit:
                quote.dispatch_unit ||
                "PCB",


            base_material:
                quote.base_material ||
                "FR-4",


            layers:
                quote.layers ||
                "2 Layers",


            thickness:
                quote.thickness ||
                "1.6 mm",


            copper_finish:
                quote.copper_finish ||
                "35 Micron",


            mask_color:
                quote.mask_color ||
                "Green",


            surface_finish:
                quote.surface_finish ||
                "Roller Tin",


            silk_screen:
                quote.silk_screen ||
                "White",


            gerber_file:
                quote.gerber_file ||
                null,


            delivery_date:
                normalizeDateForInput(
                    quote.delivery_date
                ),


            delivery_date_1:
                normalizeDateForInput(
                    quote.delivery_date_1 ||
                    quote.date_option_1
                ) || null,


            delivery_date_2:
                normalizeDateForInput(
                    quote.delivery_date_2 ||
                    quote.date_option_2
                ) || null,


            delivery_date_3:
                normalizeDateForInput(
                    quote.delivery_date_3 ||
                    quote.date_option_3
                ) || null,


            basic_price:
                Number(
                    quote.basic_price ||
                    0
                ),


            setup_cost:
                Number(
                    quote.setup_cost ||
                    0
                ),


            fpt_cost:
                Number(
                    quote.fpt_cost ||
                    quote.fpt ||
                    0
                ),


            gst:
                Number(
                    quote.gst ||
                    0
                ),


            final_total:
                Number(
                    quote.final_total ||
                    0
                ),


            status:
                quote.status ||
                "Pending",


            admin_note:
                quote.admin_note ||
                null

        };


        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method:
                        "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            updateData
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to update Admin ID."
            );

        }


        await loadQuotes();


        showToast(
            "Admin ID updated successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "ADMIN ID UPDATE ERROR:",
            error
        );


        await loadQuotes();


        showToast(
            error.message ||
            "Unable to update Admin ID.",
            "error"
        );

    }

}


// =====================================================
// DELETE QUOTE
// =====================================================

async function deleteQuote(id) {

    const quote =
        allQuotes.find(
            q =>
                Number(q.id) ===
                Number(id)
        );


    if (!quote) return;


    const confirmed =
        confirm(
            `Delete quote #${id}?\n\nThis action cannot be undone.`
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method:
                        "DELETE"

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Delete failed."
            );

        }


        allQuotes =
            allQuotes.filter(
                q =>
                    Number(q.id) !==
                    Number(id)
            );


        renderQuotes();

        updateDashboard();

        renderCustomers();


        showToast(
            "Quote deleted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        showToast(
            error.message ||
            "Unable to delete quote.",
            "error"
        );

    }

}


// =====================================================
// DELETE ALL QUOTES
// =====================================================

async function deleteAllQuotes() {

    if (!allQuotes.length) {

        alert(
            "There are no quotes to delete."
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete all ${allQuotes.length} quotes?\n\nThis action cannot be undone.`
        );


    if (!confirmed) return;


    try {

        for (
            const quote of allQuotes
        ) {

            const response =
                await fetch(
                    `${API_URL}/${quote.id}`,
                    {

                        method:
                            "DELETE"

                    }
                );


            if (!response.ok) {

                console.error(
                    "Failed to delete quote:",
                    quote.id
                );

            }

        }


        await loadQuotes();


        showToast(
            "All quotes deleted successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "DELETE ALL ERROR:",
            error
        );


        await loadQuotes();


        showToast(
            "Unable to delete all quotes.",
            "error"
        );

    }

}


// =====================================================
// SEARCH / FILTER
// =====================================================

function filterQuotes() {

    renderQuotes();

}


// =====================================================
// GET INPUT VALUE SAFELY
// =====================================================

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? String(
            element.value ||
            ""
        ).trim()
        : "";

}


// =====================================================
// SET INPUT VALUE SAFELY
// =====================================================

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ??
            "";

    }

}


// =====================================================
// TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// PCB SIZE PARSER
// Kept for existing compatibility.
// =====================================================

function parsePCBSize(
    value
) {

    const clean =
        String(
            value ||
            ""
        )
            .replace(
                /mm/gi,
                ""
            )
            .trim();


    const match =
        clean.match(
            /([0-9]+(?:\.[0-9]+)?)\s*(?:×|x|X|\*)\s*([0-9]+(?:\.[0-9]+)?)/
        );


    if (!match) {

        return {

            width:
                20,

            height:
                20

        };

    }


    return {

        width:
            Number(
                match[1]
            ),

        height:
            Number(
                match[2]
            )

    };

}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "-";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleDateString(
        "en-IN",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}


// =====================================================
// DATE INPUT FORMAT
// =====================================================

function normalizeDateForInput(
    value
) {

    if (!value) {

        return "";

    }


    const simple =
        String(
            value
        ).match(
            /^\d{4}-\d{2}-\d{2}/
        );


    if (simple) {

        return simple[0];

    }


    const date =
        new Date(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return [

        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


// =====================================================
// GERBER URL
// =====================================================

function getGerberURL(
    fileName
) {

    if (!fileName) {

        return "#";

    }


    const value =
        String(
            fileName
        );


    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {

        return value;

    }


    return (
        BASE_URL + "/uploads/" +
        encodeURIComponent(
            value
        )
    );

}


// =====================================================
// GERBER DISPLAY NAME
// =====================================================

function getOriginalDisplayName(
    fileName
) {

    if (!fileName) {

        return "No Gerber File";

    }


    const value =
        String(
            fileName
        );


    const parts =
        value.split("-");


    if (
        parts.length >= 3
    ) {

        return parts
            .slice(2)
            .join("-");

    }


    return value;

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// SAVING STATE
// =====================================================

function showSavingState(
    isSaving
) {

    const button =
        document.querySelector(
            "#editForm .save-btn"
        );


    if (!button) return;


    if (isSaving) {

        button.disabled =
            true;


        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Saving...

        `;

    } else {

        button.disabled =
            false;


        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


// =====================================================
// TOAST
// =====================================================

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "adminToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "adminToast";


        document.body.appendChild(
            toast
        );

    }


    toast.className =
        `admin-toast ${type}`;


    toast.innerHTML = `

        <i class="fa-solid ${type === "success"
            ? "fa-circle-check"
            : "fa-circle-exclamation"
        }"></i>

        <span>
            ${escapeHTML(
            message
        )}
        </span>

    `;


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    clearTimeout(
        window.adminToastTimer
    );


    window.adminToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


// =====================================================
// CLOSE MODAL ON OVERLAY CLICK
// =====================================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "editModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeEditModal();

        }

    }
);


// =====================================================
// ESC KEY
// =====================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeEditModal();

        }

    }
);


// =====================================================
// AUTO REFRESH
// =====================================================

setInterval(
    loadQuotes,
    10000
);


// =====================================================
// PRICING & DELIVERY SETTINGS
// =====================================================

// =====================================================
// PRICING & DELIVERY SETTINGS
// =====================================================

async function loadAdminPricingSettings() {

    try {

        const response =
            await fetch(
                BASE_URL + "/api/pricing-config"
            );

        if (!response.ok) {
            renderPricingTiersTable([]);
            updateAdminPricePreview();
            return;

        }

        const data =
            await response.json();

        if (data && data.settings) {

            // PCB Specifications & Defaults
            setValue(
                "adminDefaultMaterial",
                data.settings.default_material || "FR-4"
            );
            setValue(
                "adminDefaultLayers",
                data.settings.default_layer || "1 Layer"
            );
            setValue(
                "adminDefaultThickness",
                data.settings.default_thickness || "1.6 mm / 35 µm"
            );
            setValue(
                "adminDefaultMask",
                data.settings.default_mask || "Green"
            );
            setValue(
                "adminDefaultSurface",
                data.settings.default_surface || "Roller Tin"
            );
            setValue(
                "adminDefaultSilk",
                data.settings.default_silk || "White"
            );

            // Delivery Days & Rules
            setValue(
                "adminMinWorkingDays",
                data.settings.delivery_working_days ?? 6
            );

            setValue(
                "adminTuesdayHoliday",
                String(data.settings.tuesday_holiday ?? "true")
            );

            setValue(
                "quotePageDays1",
                data.settings.delivery_days_1 ?? 6
            );

            setValue(
                "quotePageDays2",
                data.settings.delivery_days_2 ?? 10
            );

            setValue(
                "adminDeliveryDiscount2",
                data.settings.delivery_discount_2 ?? 3
            );

            setValue(
                "quotePageDays3",
                data.settings.delivery_days_3 ?? 14
            );

            setValue(
                "adminDeliveryDiscount3",
                data.settings.delivery_discount_3 ?? 6
            );

            // Price Summary controls
            setValue(
                "adminSetupCost",
                data.settings.setup_cost ?? 700
            );

            setValue(
                "adminBaseRate",
                data.settings.base_rate ?? 0.60
            );

            const gstRate = data.settings.gst_rate !== undefined
                ? (Number(data.settings.gst_rate) > 1 ? Number(data.settings.gst_rate) : Number(data.settings.gst_rate) * 100)
                : 18;

            setValue(
                "adminGSTRate",
                gstRate
            );

            setValue(
                "adminFptCost",
                data.settings.fpt_cost ?? 0
            );

        }

        const DEFAULT_TIERS = [
            { min_cost: 0, max_cost: 1000, fixed_charge: 700, multiplying_factor: 0.70, discount: 0 },
            { min_cost: 1000, max_cost: 5000, fixed_charge: 0, multiplying_factor: 0.65, discount: 0 },
            { min_cost: 5000, max_cost: 10000, fixed_charge: 0, multiplying_factor: 0.62, discount: 0 },
            { min_cost: 10000, max_cost: 15000, fixed_charge: 0, multiplying_factor: 0.58, discount: 0 },
            { min_cost: 15000, max_cost: 20000, fixed_charge: 0, multiplying_factor: 0.54, discount: 0 },
            { min_cost: 20000, max_cost: 25000, fixed_charge: 0, multiplying_factor: 0.50, discount: 0 },
            { min_cost: 25000, max_cost: 30000, fixed_charge: 0, multiplying_factor: 0.45, discount: 0 }
        ];

        let finalTiers = DEFAULT_TIERS;
        if (data && Array.isArray(data.tiers) && data.tiers.length >= 7) {
            finalTiers = data.tiers;
        } else if (data && Array.isArray(data.tiers) && data.tiers.length > 0) {
            finalTiers = DEFAULT_TIERS.map((def, idx) => data.tiers[idx] || def);
        }

        renderPricingTiersTable(finalTiers);
        updateAdminPricePreview();

    } catch (err) {

        console.warn(
            "Failed to load admin pricing settings, using defaults:",
            err
        );
        renderPricingTiersTable([]);
        updateAdminPricePreview();

    }

}


// =====================================================
// RENDER PRICING TIERS
// =====================================================

function renderPricingTiersTable(
    tiers
) {

    const tbody =
        document.getElementById(
            "pricingTiersBody"
        );

    if (!tbody) return;

    const DEFAULT_TIERS = [
        { min_cost: 0, max_cost: 1000, fixed_charge: 700, multiplying_factor: 0.70, discount: 0 },
        { min_cost: 1000, max_cost: 5000, fixed_charge: 0, multiplying_factor: 0.65, discount: 0 },
        { min_cost: 5000, max_cost: 10000, fixed_charge: 0, multiplying_factor: 0.62, discount: 0 },
        { min_cost: 10000, max_cost: 15000, fixed_charge: 0, multiplying_factor: 0.58, discount: 0 },
        { min_cost: 15000, max_cost: 20000, fixed_charge: 0, multiplying_factor: 0.54, discount: 0 },
        { min_cost: 20000, max_cost: 25000, fixed_charge: 0, multiplying_factor: 0.50, discount: 0 },
        { min_cost: 25000, max_cost: 30000, fixed_charge: 0, multiplying_factor: 0.45, discount: 0 }
    ];

    if (!tiers || tiers.length === 0) {
        tiers = DEFAULT_TIERS;
    } else if (tiers.length < 7) {
        tiers = DEFAULT_TIERS.map((def, idx) => tiers[idx] || def);
    }

    tbody.innerHTML = "";

    tiers.forEach(
        tier => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.className =
                "tier-row";

            tr.style.borderBottom =
                "1px solid #eee";

            tr.innerHTML = `

                <td style="padding: 8px;">

                    <input
                        type="number"
                        class="tier-min"
                        value="${tier.min_cost ?? 0}"
                        step="0.01"
                        style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        "
                    >

                </td>

                <td style="padding: 8px;">

                    <input
                        type="number"
                        class="tier-max"
                        value="${tier.max_cost ?? 100000}"
                        step="0.01"
                        style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        "
                    >

                </td>

                <td style="padding: 8px;">

                    <input
                        type="number"
                        class="tier-fixed"
                        value="${tier.fixed_charge ?? 0}"
                        step="0.01"
                        style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        "
                    >

                </td>

                <td style="padding: 8px;">

                    <input
                        type="number"
                        class="tier-mult"
                        value="${tier.multiplying_factor ?? 1}"
                        step="0.0001"
                        style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        "
                    >

                </td>

                <td style="padding: 8px;">

                    <input
                        type="number"
                        class="tier-discount"
                        value="${tier.discount ?? 0}"
                        step="0.01"
                        style="
                            width: 100%;
                            padding: 6px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        "
                    >

                </td>

                <td style="padding: 8px;">

                    <button
                        type="button"
                        onclick="deletePricingTierRow(this)"
                        style="
                            background: #dc2626;
                            color: #fff;
                            border: 0;
                            padding: 6px 12px;
                            border-radius: 4px;
                            font-weight: 700;
                            cursor: pointer;
                        "
                    >

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            `;

            tbody.appendChild(
                tr
            );

        }
    );

}


// =====================================================
// ADD PRICING TIER
// =====================================================

function addPricingTierRow() {

    const tbody =
        document.getElementById(
            "pricingTiersBody"
        );

    if (!tbody) return;

    const tr =
        document.createElement(
            "tr"
        );

    tr.className =
        "tier-row";

    tr.style.borderBottom =
        "1px solid #eee";

    tr.innerHTML = `

        <td style="padding: 8px;">

            <input
                type="number"
                class="tier-min"
                value="0"
                step="0.01"
                style="
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                "
            >

        </td>

        <td style="padding: 8px;">

            <input
                type="number"
                class="tier-max"
                value="10000"
                step="0.01"
                style="
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                "
            >

        </td>

        <td style="padding: 8px;">

            <input
                type="number"
                class="tier-fixed"
                value="0"
                step="0.01"
                style="
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                "
            >

        </td>

        <td style="padding: 8px;">

            <input
                type="number"
                class="tier-mult"
                value="1"
                step="0.0001"
                style="
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                "
            >

        </td>

        <td style="padding: 8px;">

            <input
                type="number"
                class="tier-discount"
                value="0"
                step="0.01"
                style="
                    width: 100%;
                    padding: 6px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                "
            >

        </td>

        <td style="padding: 8px;">

            <button
                type="button"
                onclick="deletePricingTierRow(this)"
                style="
                    background: #dc2626;
                    color: #fff;
                    border: 0;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-weight: 700;
                    cursor: pointer;
                "
            >

                <i class="fa-solid fa-trash"></i>

            </button>

        </td>

    `;

    tbody.appendChild(
        tr
    );

}


// =====================================================
// DELETE PRICING TIER
// =====================================================

function deletePricingTierRow(
    btn
) {

    const row =
        btn.closest(
            "tr"
        );

    if (row) {

        row.remove();

    }

}


// =====================================================
// LIVE ADMIN PRICE PREVIEW
// =====================================================

function updateAdminPricePreview() {

    const firstTierFixed = parseFloat(document.querySelector("#pricingTiersBody .tier-fixed")?.value);
    const setupCost = !isNaN(firstTierFixed) ? firstTierFixed : Number(getValue("adminSetupCost") || 700);
    const hiddenSetup = document.getElementById("adminSetupCost");
    if (hiddenSetup) hiddenSetup.value = setupCost;

    const baseRate = Number(getValue("adminBaseRate") || 0.60);
    const gstPercent = Number(getValue("adminGSTRate") || 18);
    const fptCost = Number(getValue("adminFptCost") || 0);

    // Sample preview values: 20mm x 20mm, qty 3
    const width = 20;
    const height = 20;
    const qty = 3;
    const areaPerPCB = (width * height) / 100; // 4 cm²
    const totalArea = areaPerPCB * qty; // 12 cm²
    const basicPrice = totalArea * baseRate + fptCost;

    const subtotal = basicPrice + setupCost;
    const gst = subtotal * (gstPercent / 100);
    const finalTotal = subtotal + gst;

    const basicEl = document.getElementById("previewBasicPrice");
    if (basicEl) basicEl.textContent = "₹" + basicPrice.toFixed(2);

    const setupEl = document.getElementById("previewSetupCost");
    if (setupEl) setupEl.textContent = "₹" + setupCost.toFixed(2);

    const gstLabel = document.getElementById("previewGstLabel");
    if (gstLabel) gstLabel.textContent = `GST (${gstPercent}%):`;

    const gstEl = document.getElementById("previewGST");
    if (gstEl) gstEl.textContent = "₹" + gst.toFixed(2);

    const totalEl = document.getElementById("previewFinalTotal");
    if (totalEl) totalEl.textContent = "₹" + finalTotal.toFixed(2);

}


// =====================================================
// SAVE ADMIN PRICING & QUOTE PAGE SETTINGS
// =====================================================

async function saveAdminPricingSettings() {

    try {

        const minDaysEl =
            document.getElementById(
                "adminMinWorkingDays"
            );

        const tuesdayEl =
            document.getElementById(
                "adminTuesdayHoliday"
            );

        const delivery_working_days =
            minDaysEl
                ? Number(
                    minDaysEl.value
                ) || 6
                : 6;

        const tuesday_holiday =
            tuesdayEl
                ? tuesdayEl.value
                : "true";

        const days1 = Number(getValue("quotePageDays1") || 6);
        const days2 = Number(getValue("quotePageDays2") || 10);
        const days3 = Number(getValue("quotePageDays3") || 14);
        const discount2 = Number(getValue("adminDeliveryDiscount2") !== "" ? getValue("adminDeliveryDiscount2") : 3);
        const discount3 = Number(getValue("adminDeliveryDiscount3") !== "" ? getValue("adminDeliveryDiscount3") : 6);
        const firstTierFixed = parseFloat(document.querySelector("#pricingTiersBody .tier-fixed")?.value);
        const setupCost = !isNaN(firstTierFixed) ? firstTierFixed : 700;
        setValue("adminSetupCost", setupCost);
        const baseRate = Number(getValue("adminBaseRate") || 0.60);
        const gstPercent = Number(getValue("adminGSTRate") || 18);
        const fptCost = Number(getValue("adminFptCost") || 0);

        const rows =
            document.querySelectorAll(
                "#pricingTiersBody .tier-row"
            );

        const tiers = [];

        rows.forEach(
            row => {

                const minC =
                    parseFloat(
                        row.querySelector(
                            ".tier-min"
                        )?.value
                    ) || 0;

                const maxC =
                    parseFloat(
                        row.querySelector(
                            ".tier-max"
                        )?.value
                    ) || 100000;

                const fixedC =
                    parseFloat(
                        row.querySelector(
                            ".tier-fixed"
                        )?.value
                    ) || 0;

                const multF =
                    parseFloat(
                        row.querySelector(
                            ".tier-mult"
                        )?.value
                    ) || 1;

                const disc =
                    parseFloat(
                        row.querySelector(
                            ".tier-discount"
                        )?.value
                    ) || 0;

                tiers.push({

                    min_cost:
                        minC,

                    max_cost:
                        maxC,

                    fixed_charge:
                        fixedC,

                    multiplying_factor:
                        multF,

                    discount:
                        disc

                });

            }
        );

        const default_material = getValue("adminDefaultMaterial") || "FR-4";
        const default_layer = getValue("adminDefaultLayers") || "1 Layer";
        const default_thickness = getValue("adminDefaultThickness") || "1.6 mm / 35 µm";
        const default_mask = getValue("adminDefaultMask") || "Green";
        const default_surface = getValue("adminDefaultSurface") || "Roller Tin";
        const default_silk = getValue("adminDefaultSilk") || "White";

        const res =
            await fetch(
                BASE_URL + "/api/pricing-config",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            tiers:
                                tiers,

                            settings: {

                                default_material:
                                    default_material,

                                default_layer:
                                    default_layer,

                                default_thickness:
                                    default_thickness,

                                default_mask:
                                    default_mask,

                                default_surface:
                                    default_surface,

                                default_silk:
                                    default_silk,

                                delivery_working_days:
                                    delivery_working_days,

                                tuesday_holiday:
                                    tuesday_holiday,

                                delivery_days_1:
                                    days1,

                                delivery_days_2:
                                    days2,

                                delivery_discount_2:
                                    discount2,

                                delivery_days_3:
                                    days3,

                                delivery_discount_3:
                                    discount3,

                                setup_cost:
                                    setupCost,

                                base_rate:
                                    baseRate,

                                gst_rate:
                                    (gstPercent / 100).toString(),

                                fpt_cost:
                                    fptCost

                            }

                        })

                }
            );

        const data =
            await res.json();

        if (
            res.ok &&
            data.success
        ) {

            showToast(
                "Quote Page settings saved successfully!",
                "success"
            );

            try {
                const bc = new BroadcastChannel("ecube_pricing_channel");
                bc.postMessage({ type: "PRICING_UPDATED", timestamp: Date.now() });
                bc.close();
            } catch (e) { }

            try {
                localStorage.setItem("ecube_pricing_updated_at", Date.now().toString());
            } catch (e) { }

            await loadAdminPricingSettings();

        } else {

            showToast(
                data.message ||
                "Failed to save settings.",
                "error"
            );

        }

    } catch (err) {

        console.error(
            "Save settings error:",
            err
        );

        showToast(
            "Error saving Quote Page settings.",
            "error"
        );

    }

}


// =====================================================
// SIDEBAR NAVIGATION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const menuLinks = document.querySelectorAll(".sidebar-menu .menu-item");

    menuLinks.forEach(link => {

        link.addEventListener("click", function (e) {

            menuLinks.forEach(m => m.classList.remove("active"));
            this.classList.add("active");

        });

    });

});