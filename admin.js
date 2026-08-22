const API_URL = "http://localhost:5000/api/quotes";

let allQuotes = [];


// =====================================================
// PAGE LOAD
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    loadQuotes();

    setupEditForm();

});


// =====================================================
// LOAD QUOTES FROM BACKEND
// =====================================================

async function loadQuotes() {

    try {

        console.log("Fetching quotes from backend...");

        const response = await fetch(API_URL);

        if (!response.ok) {

            throw new Error(
                `HTTP Error: ${response.status}`
            );

        }

        const data = await response.json();

        console.log("Backend response:", data);


        // Your API returns direct array
        allQuotes = Array.isArray(data)
            ? data
            : data.quotes || [];


        console.log(
            "Total quotes received:",
            allQuotes.length
        );


        renderQuotes();

        updateDashboard();

        renderCustomers();


    } catch (error) {

        console.error(
            "LOAD QUOTES ERROR:",
            error
        );


        const table =
            document.getElementById(
                "quotesTable"
            );


        if (table) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="9"
                        style="text-align:center; color:red;"
                    >

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

    const table =
        document.getElementById(
            "quotesTable"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!table) {

        console.error(
            "quotesTable not found in admin.html"
        );

        return;

    }


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const search =
        searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";


    const selectedStatus =
        statusFilter
        ? statusFilter.value
        : "all";


    // =================================================
    // FILTER
    // =================================================

    const filteredQuotes =
        allQuotes.filter((quote) => {

            const email =
                (quote.email || "")
                    .toLowerCase();


            const phone =
                (quote.phone || "")
                    .toLowerCase();


            const pcbName =
                (quote.pcb_name || "")
                    .toLowerCase();


            const status =
                (quote.status || "")
                    .toLowerCase();


            const searchMatch =

                email.includes(search) ||

                phone.includes(search) ||

                pcbName.includes(search);


            const statusMatch =

                selectedStatus === "all" ||

                status ===
                selectedStatus.toLowerCase();


            return (
                searchMatch &&
                statusMatch
            );

        });


    table.innerHTML = "";


    // =================================================
    // EMPTY
    // =================================================

    if (filteredQuotes.length === 0) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    // =================================================
    // TABLE ROWS
    // =================================================

    filteredQuotes.forEach(
        (quote, index) => {

            const row =
                document.createElement("tr");


            // Customer
            const customerHTML = `

                <div class="customer-cell">

                    <strong>
                        ${escapeHTML(
                            quote.email || "-"
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            quote.phone || "-"
                        )}
                    </small>

                </div>

            `;


            // PCB Details
            const pcbHTML = `

                <div class="pcb-details">

                    <strong>
                        ${escapeHTML(
                            quote.pcb_name || "-"
                        )}
                    </strong>

                    <small>
                        Size:
                        ${escapeHTML(
                            quote.model_width || "-"
                        )}
                        ×
                        ${escapeHTML(
                            quote.height || "-"
                        )} mm
                    </small>

                    <small>
                        Material:
                        ${escapeHTML(
                            quote.base_material || "FR-4"
                        )}
                    </small>

                    <small>
                        Layers:
                        ${escapeHTML(
                            quote.layers || "-"
                        )}
                    </small>

                </div>

            `;


            // Delivery date
            let deliveryDate = "-";


            if (quote.delivery_date) {

                const date =
                    new Date(
                        quote.delivery_date
                    );


                if (!isNaN(date)) {

                    deliveryDate =
                        date.toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        );

                }

            }


            // Gerber
            let gerberHTML =
                `<span>No File</span>`;


            if (quote.gerber_file) {

                gerberHTML = `

                    <a
                        href="${getGerberURL(
                            quote.gerber_file
                        )}"
                        target="_blank"
                        class="gerber-btn"
                    >

                        <i class="fa-solid fa-file-zipper"></i>

                        View File

                    </a>

                `;

            }


            // Final price
            const finalTotal =
                Number(
                    quote.final_total || 0
                );


            // Status
            const status =
                quote.status ||
                "Pending";


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>
                    ${customerHTML}
                </td>


                <td>
                    ${pcbHTML}
                </td>


                <td>
                    ${quote.quantity || "-"}
                </td>


                <td>
                    ${deliveryDate}
                </td>


                <td>
                    ${gerberHTML}
                </td>


                <td>

                    <strong>
                        ₹${finalTotal.toFixed(2)}
                    </strong>

                </td>


                <td>

                    <select
                        class="status-select"
                        onchange="
                            changeStatus(
                                ${quote.id},
                                this.value
                            )
                        "
                    >

                        <option
                            value="Pending"
                            ${
                                status === "Pending"
                                ? "selected"
                                : ""
                            }
                        >
                            Pending
                        </option>


                        <option
                            value="Processing"
                            ${
                                status === "Processing"
                                ? "selected"
                                : ""
                            }
                        >
                            Processing
                        </option>


                        <option
                            value="Completed"
                            ${
                                status === "Completed"
                                ? "selected"
                                : ""
                            }
                        >
                            Completed
                        </option>


                        <option
                            value="Cancelled"
                            ${
                                status === "Cancelled"
                                ? "selected"
                                : ""
                            }
                        >
                            Cancelled
                        </option>

                    </select>

                </td>


                <td>

                    <div class="action-buttons">

                        <button
                            class="edit-btn"
                            onclick="
                                openEditModal(
                                    ${quote.id}
                                )
                            "
                        >

                            <i class="fa-solid fa-pen"></i>

                        </button>


                        <button
                            class="delete-btn"
                            onclick="
                                deleteQuote(
                                    ${quote.id}
                                )
                            "
                        >

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            `;


            table.appendChild(row);

        }
    );

}


// =====================================================
// DASHBOARD STATS
// =====================================================

function updateDashboard() {

    const totalQuotes =
        allQuotes.length;


    const customers =
        new Set(
            allQuotes.map(
                quote => quote.email
            )
        ).size;


    const pending =
        allQuotes.filter(
            quote =>
                quote.status === "Pending"
        ).length;


    const totalValue =
        allQuotes.reduce(
            (total, quote) => {

                return total +
                    Number(
                        quote.final_total || 0
                    );

            },
            0
        );


    setText(
        "totalQuotes",
        totalQuotes
    );


    setText(
        "totalCustomers",
        customers
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
// CUSTOMER GRID
// =====================================================

function renderCustomers() {

    const grid =
        document.getElementById(
            "customerGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    const customers = {};


    allQuotes.forEach(
        (quote) => {

            const email =
                quote.email || "Unknown";


            if (!customers[email]) {

                customers[email] = {

                    email: email,

                    phone:
                        quote.phone || "-",

                    quotes: 0,

                    totalValue: 0

                };

            }


            customers[email].quotes++;


            customers[email].totalValue +=
                Number(
                    quote.final_total || 0
                );

        }
    );


    Object.values(customers)
        .forEach(
            (customer) => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "customer-card";


                card.innerHTML = `

                    <div class="customer-icon">

                        <i
                            class="fa-solid fa-user"
                        ></i>

                    </div>


                    <div>

                        <h3>
                            ${escapeHTML(
                                customer.email
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                customer.phone
                            )}
                        </p>

                        <small>

                            ${customer.quotes}
                            Quote(s)

                            &nbsp; | &nbsp;

                            ₹${customer.totalValue.toFixed(2)}

                        </small>

                    </div>

                `;


                grid.appendChild(card);

            }
        );

}


// =====================================================
// OPEN EDIT MODAL
// =====================================================

function openEditModal(id) {

    const quote =
        allQuotes.find(
            q => q.id == id
        );


    if (!quote) {

        alert(
            "Quote not found."
        );

        return;

    }


    document.getElementById(
        "editId"
    ).value = quote.id;


    document.getElementById(
        "editEmail"
    ).value =
        quote.email || "";


    document.getElementById(
        "editPhone"
    ).value =
        quote.phone || "";


    document.getElementById(
        "editPcbName"
    ).value =
        quote.pcb_name || "";


    document.getElementById(
        "editDispatch"
    ).value =
        quote.dispatch_unit || "PCB";


    document.getElementById(
        "editSize"
    ).value =
        `${quote.model_width || ""} × ${quote.height || ""} mm`;


    document.getElementById(
        "editQuantity"
    ).value =
        quote.quantity || 1;


    // Date
    if (quote.delivery_date) {

        const date =
            new Date(
                quote.delivery_date
            );


        if (!isNaN(date)) {

            const year =
                date.getFullYear();


            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");


            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");


            document.getElementById(
                "editDeliveryDate"
            ).value =
                `${year}-${month}-${day}`;

        }

    }


    document.getElementById(
        "editBasicPrice"
    ).value =
        quote.basic_price || 0;


    document.getElementById(
        "editSetupCost"
    ).value =
        quote.setup_cost || 0;


    document.getElementById(
        "editGST"
    ).value =
        quote.gst || 0;


    document.getElementById(
        "editFinalTotal"
    ).value =
        quote.final_total || 0;


    document.getElementById(
        "editStatus"
    ).value =
        quote.status || "Pending";


    document.getElementById(
        "editModal"
    ).classList.add("active");

}


// =====================================================
// CLOSE EDIT MODAL
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

}


// =====================================================
// SAVE EDIT
// =====================================================

function setupEditForm() {

    const form =
        document.getElementById(
            "editForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "editId"
                ).value;


            const updateData = {

                email:
                    document.getElementById(
                        "editEmail"
                    ).value,

                phone:
                    document.getElementById(
                        "editPhone"
                    ).value,

                pcb_name:
                    document.getElementById(
                        "editPcbName"
                    ).value,

                dispatch_unit:
                    document.getElementById(
                        "editDispatch"
                    ).value,

                quantity:
                    Number(
                        document.getElementById(
                            "editQuantity"
                        ).value
                    ),

                delivery_date:
                    document.getElementById(
                        "editDeliveryDate"
                    ).value,

                basic_price:
                    Number(
                        document.getElementById(
                            "editBasicPrice"
                        ).value
                    ),

                setup_cost:
                    Number(
                        document.getElementById(
                            "editSetupCost"
                        ).value
                    ),

                gst:
                    Number(
                        document.getElementById(
                            "editGST"
                        ).value
                    ),

                final_total:
                    Number(
                        document.getElementById(
                            "editFinalTotal"
                        ).value
                    ),

                status:
                    document.getElementById(
                        "editStatus"
                    ).value

            };


            try {

                const response =
                    await fetch(
                        `${API_URL}/${id}`,
                        {

                            method: "PUT",

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


                console.log(
                    "Update response:",
                    data
                );


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Update failed"
                    );

                }


                alert(
                    "Quote updated successfully!"
                );


                closeEditModal();


                await loadQuotes();


            } catch (error) {

                console.error(
                    "UPDATE ERROR:",
                    error
                );


                alert(
                    "Unable to update quote."
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

    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({
                            status: status
                        })

                }
            );


        const data =
            await response.json();


        console.log(
            "Status response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Status update failed"
            );

        }


        await loadQuotes();


    } catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );


        alert(
            "Unable to update status."
        );

    }

}


// =====================================================
// DELETE QUOTE
// =====================================================

async function deleteQuote(id) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this quote?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        console.log(
            "Delete response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Delete failed"
            );

        }


        alert(
            "Quote deleted successfully!"
        );


        await loadQuotes();


    } catch (error) {

        console.error(
            "DELETE ERROR:",
            error
        );


        alert(
            "Unable to delete quote."
        );

    }

}


// =====================================================
// DELETE ALL QUOTES
// =====================================================

async function deleteAllQuotes() {

    if (allQuotes.length === 0) {

        alert(
            "There are no quotes to delete."
        );

        return;

    }


    const confirmation =
        confirm(
            `Are you sure you want to delete all ${allQuotes.length} quotes?`
        );


    if (!confirmation) {
        return;
    }


    try {

        for (
            const quote of allQuotes
        ) {

            await fetch(
                `${API_URL}/${quote.id}`,
                {
                    method: "DELETE"
                }
            );

        }


        alert(
            "All quotes deleted successfully!"
        );


        await loadQuotes();


    } catch (error) {

        console.error(
            "DELETE ALL ERROR:",
            error
        );


        alert(
            "Unable to delete all quotes."
        );

    }

}


// =====================================================
// SEARCH + FILTER
// =====================================================

function filterQuotes() {

    renderQuotes();

}


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// GERBER URL
// =====================================================

function getGerberURL(
    fileName
) {

    if (
        fileName.startsWith(
            "http://"
        ) ||

        fileName.startsWith(
            "https://"
        )
    ) {

        return fileName;

    }


    return (
        "http://localhost:5000/uploads/" +
        encodeURIComponent(fileName)
    );

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
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
// AUTO REFRESH
// =====================================================

setInterval(
    loadQuotes,
    5000
);