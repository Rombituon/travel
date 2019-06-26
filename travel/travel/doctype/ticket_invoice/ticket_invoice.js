// Copyright (c) 2019, Bilal Ghayad and contributors
// For license information, please see license.txt
cur_frm.add_fetch('customer', 'customer_name', 'customer_name')
cur_frm.add_fetch('supplier', 'supplier_name', 'supplier_name')
cur_frm.add_fetch('supplier', 'bsp', 'bsp')
frappe.ui.form.on('Ticket Invoice', {
	refresh: function(frm) {
		if (frm.doc.__islocal == 1) {
			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_employee_id",
				args: {
					user_id: frappe.session.user
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("created_by", r.message[0]);
						cur_frm.set_value("created_by_employee_name", r.message[1]);
//						refresh_field("created_by");
//						frappe.msgprint(__("Employee ID is {0} and user id is {1}", [r.message, frappe.session.user]));
					}
				}
			});
		}

		if(frm.doc.docstatus===1) {
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.route_options = {
					voucher_no: frm.doc.name,
					from_date: frm.doc.posting_date,
					to_date: frm.doc.posting_date,
					company: frm.doc.company,
					group_by_voucher: false
				};
				frappe.set_route("query-report", "General Ledger");
			}, __("View"));
			frm.add_custom_button(__("Show Payments"), function() {
				frappe.set_route("List", "Payment Entry", {"Payment Entry Reference.reference_name": frm.doc.name});
			}, __("View"));
			frm.add_custom_button(__('Payment'), function() { frm.events.make_payment_entry(frm); }, __("Make"));
			cur_frm.page.set_inner_btn_group_as_primary(__("Make"));
		}
	},
	onload: function(frm) {
		frappe.msgprint(__("Welcome ... TEST 3"));
/*	    
		if (frm.doc.__islocal == 1) {
			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_employee_id",
				args: {
					user_id: frappe.session.user
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("created_by", r.message);
						refresh_field("created_by");
//						frappe.msgprint(__("Employee ID is {0} and user id is {1}", [r.message, frappe.session.user]));
					}
				}
			});
		}
*/
		if (frm.doc.__islocal == 1) {
			cur_frm.set_value("status", 'Draft');
			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_company_accounts",
				args: {
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.message) {
						cur_frm.set_value("receivable_account", r.message[0][0]['default_receivable_account']);
						cur_frm.set_value("payable_account", r.message[0][0]['default_payable_account']);
						cur_frm.set_value("income_account", r.message[0][0]['default_income_account']);
						cur_frm.set_value("cost_center", r.message[0][0]['cost_center']);
					}
					else {
						frappe.msgprint(__("There are not a default accounts in the Company {0}, please select the Accounts", [frm.doc.company]));
					}
				}
			});
		}

		frm.set_query('customer', function(doc) {
			return {
				query: "erpnext.controllers.queries.customer_query"
			};
		});
	},

	customer: function(frm) {
		if (frm.doc.customer) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Customer', party: frm.doc.customer, company: frm.doc.company},
				callback: function(r) {
					if (flt(r.message) == 0) {
						frm.set_value("customer_balance", "0.00");
					}
					else {
						frm.set_value("customer_balance", r.message);
					}
				}
			});

			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_party_details",
				args: {
					party_type: 'Customer',
					party: frm.doc.customer,
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.message[1]) {
						frm.set_value("customer_currency", r.message[1]);
						if (r.message[1] != 'USD') {
							frappe.msgprint(__("This Customer Account is {0} and it should be USD, please select another customer account or the transaction will not be allowed", [r.message[1]]));
						}
					}
					else {
						frm.set_value("customer_currency", "USD");
					}
				}
			});

		}
	},

	supplier: function(frm) {
		if (frm.doc.supplier) {
			frappe.call({
				method: "erpnext.accounts.utils.get_balance_on",
				args: {date: frm.doc.posting_date, party_type: 'Supplier', party: frm.doc.supplier, company: frm.doc.company},
				callback: function(r) {
					if (flt(r.message) == 0) {
						frm.set_value("supplier_balance", "0.00");
					}
					else {
						frm.set_value("supplier_balance", r.message);
					}
					refresh_field('supplier_balance');
				}
			});

			frappe.call({
				method: "travel.travel.doctype.ticket_invoice.ticket_invoice.get_party_details",
				args: {
					party_type: 'Supplier',
					party: frm.doc.supplier,
					company: frm.doc.company
				},
				callback: function(r) {
					if (r.message[1]) {
						frm.set_value("supplier_currency", r.message[1]);
						if (r.message[1] != 'USD') {
							frappe.msgprint(__("This Supplier Account is {0} and it should be USD, please select another supplier account or the transaction will not be allowed", [r.message[1]]));
						}
					}
					else {
						frm.set_value("supplier_currency", "USD");
					}
				}
			});

		}
	},

	discount_amount: function(frm) {
	
		if (frm.doc.cust_total_amount > 0) {
			frm.doc.discount_percent = flt(frm.doc.discount_amount) * 100 / flt(frm.doc.cust_total_amount);
			refresh_field("discount_percent");	
			frm.set_value("cust_grand_total", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
			frm.set_value("uatp_grand_total", flt(frm.doc.cust_grand_total) - flt(frm.doc.supp_grand_total));
			frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
		}
		else {
			frm.doc.discount_amount = 0;
			refresh_field("discount_amount");
			frappe.msgprint(__("Customer Total Amount Should be > 0"));
		}
	},

	discount_percent: function(frm) {
	
		frm.doc.discount_amount = flt(frm.doc.discount_percent) * flt(frm.doc.cust_total_amount) / 100;
		refresh_field("discount_amount");	
		frm.set_value("cust_grand_total", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
		frm.set_value("uatp_grand_total", flt(frm.doc.cust_grand_total) - flt(frm.doc.supp_grand_total));
		frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
	},

        make_payment_entry: function(frm) {
		var method = "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry";
		return frappe.call({
			method: method,
			args: {
				"dt": frm.doc.doctype,
				"dn": frm.doc.name
			},
			callback: function(r) {
				var doclist = frappe.model.sync(r.message);
				frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
			}
		});
	}
});

frappe.ui.form.on('Ticket Invoice Ticket', {

	items_remove: function(frm, cdt, cdn) {
		items_calculation(frm, cdt, cdn);
	},

	tax1: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax1) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5) 
						+ flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax1) == 0) {
			item.tax2 = item.tax3 = item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax2: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax2) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax2) == 0) {
			item.tax3 = item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax3: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax3) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax3) == 0) {
			item.tax4 = item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax4: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax4) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax4) == 0) {
			item.tax5 = item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax5: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax5) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax5) == 0) {
			item.tax6 = item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax6: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax6) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax6) == 0) {
			item.tax7 = item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax7: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax7) > 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
		else if (flt(item.tax7) == 0) {
			item.tax8 = 0;
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4) + flt(item.tax5) + flt(item.tax6);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	tax8: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.tax8) >= 0) {
			item.total_taxes = flt(item.tax1) + flt(item.tax2) + flt(item.tax3) + flt(item.tax4)
						+ flt(item.tax5) +flt(item.tax6) + flt(item.tax7) + flt(item.tax8);
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	gross_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) >0) {
			item.service_charge_amount = flt(item.cust_cut_fare) * flt(item.service_charge_percent) / 100;
			item.cust_discount_amount = flt(item.cust_cut_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
		}
		else if (flt(item.cust_cut_fare) == 0) {
			item.service_charge_amount = flt(item.gross_fare) * flt(item.service_charge_percent) / 100;;
			item.cust_discount_amount = flt(item.gross_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
		}
		if (flt(item.supp_cut_fare) > 0) {
			item.supp_discount_amount = flt(item.supp_cut_fare) * flt(item.supp_discount_percent) / 100;
		}
		else if (flt(item.supp_cut_fare) == 0) {
			item.supp_discount_amount = flt(item.gross_fare) * flt(item.supp_discount_percent) / 100;
		}
		if (flt(item.gross_fare) >= 0) {
			frappe.model.set_value(cdt, cdn, "fare_taxes", flt(item.total_taxes) + flt(item.gross_fare));
			refresh_field("items");
		}
	},

	supp_cut_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) > 0) {
			item.supp_discount_amount = flt(item.supp_cut_fare) * flt(item.supp_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.total_taxes) + flt(item.supp_cut_fare)
										- flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else if (flt(item.supp_cut_fare) == 0) {
			item.supp_discount_amount = flt(item.gross_fare) * flt(item.supp_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
	},

	cust_cut_fare: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			item.service_charge_amount = flt(item.cust_cut_fare) * flt(item.service_charge_percent) / 100;
			item.cust_discount_amount = flt(item.cust_cut_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0) {
			item.service_charge_amount = flt(item.gross_fare) * flt(item.service_charge_percent) / 100;
			item.cust_discount_amount = flt(item.gross_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	cust_discount_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			item.cust_discount_percent = flt(item.cust_discount_amount) * 100 / flt(item.cust_cut_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0 && flt(item.gross_fare) > 0) {
			item.cust_discount_percent = flt(item.cust_discount_amount) * 100 / flt(item.gross_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else {
			item.cust_discount_amount = 0;
			refresh_field("items");
			frappe.msgprint(__("Gross Fare or Customer Cut Fare should be > 0"));
		}
	},

	cust_discount_percent: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			item.cust_discount_amount = flt(item.cust_cut_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0) {
			item.cust_discount_amount = flt(item.gross_fare) * flt(item.cust_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	supp_discount_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) > 0) {
			item.supp_discount_percent = flt(item.supp_discount_amount) * 100 / flt(item.supp_cut_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.total_taxes) + flt(item.supp_cut_fare)
										- flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else if (flt(item.supp_cut_fare) == 0 && flt(item.gross_fare) > 0) {
			item.supp_discount_percent = flt(item.supp_discount_amount) * 100 / flt(item.gross_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else {
			item.supp_discount_amount = 0;
			refresh_field("items");
			frappe.msgprint(__("Gross Fare or Supplier Cut Fare should be > 0"));
		}
	},

	supp_discount_percent: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) > 0) {
			item.supp_discount_amount = flt(item.supp_cut_fare) * flt(item.supp_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.total_taxes) + flt(item.supp_cut_fare)
										- flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else if (flt(item.supp_cut_fare) == 0) {
			item.supp_discount_amount = flt(item.gross_fare) * flt(item.supp_discount_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		
	},

	supp_iata_insurance: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) > 0) {
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.total_taxes) + flt(item.supp_cut_fare)
										- flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else if (flt(item.supp_cut_fare) == 0) {
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
	},

	cust_iata_insurance: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0) {
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	service_charge_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			item.service_charge_percent = flt(item.service_charge_amount) * 100 / flt(item.cust_cut_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0) {
			item.service_charge_percent = flt(item.service_charge_amount) * 100 / flt(item.gross_fare);
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	service_charge_percent: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.cust_cut_fare) > 0) {
			item.service_charge_amount = flt(item.cust_cut_fare) * flt(item.service_charge_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) == 0) {
			item.service_charge_amount = flt(item.gross_fare) * flt(item.service_charge_percent) / 100;
			refresh_field("items");
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount)
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	fare_taxes: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		if (flt(item.supp_cut_fare) == 0) {
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.fare_taxes) - flt(item.supp_discount_amount) + flt(item.supp_iata_insurance));
		}
		else if (flt(item.supp_cut_fare) > 0) {
			frappe.model.set_value(cdt, cdn, "supp_total_amount", flt(item.total_taxes) + flt(item.supp_cut_fare) - flt(item.supp_discount_amount) 
										+ flt(item.supp_iata_insurance));
		}
		if (flt(item.cust_cut_fare) == 0) {
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.fare_taxes) - flt(item.cust_discount_amount) 
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
		else if (flt(item.cust_cut_fare) > 0) {
			frappe.model.set_value(cdt, cdn, "cust_total_amount", flt(item.total_taxes) + flt(item.cust_cut_fare) - flt(item.cust_discount_amount) 
										+ flt(item.cust_iata_insurance) + flt(item.service_charge_amount));
		}
	},

	supp_total_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "uatp_amount", flt(item.cust_total_amount) - flt(item.supp_total_amount));
		items_calculation(frm, cdt, cdn);
	},

	cust_total_amount: function(frm, cdt, cdn) {
		var item = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "uatp_amount", flt(item.cust_total_amount) - flt(item.supp_total_amount));
		items_calculation(frm, cdt, cdn);
	}
});


frappe.ui.form.on('Travel Payment', {

	payments_remove: function(frm, cdt, cdn) {
		paid_amount_calculation(frm, cdt, cdn);
	},

	mode_of_payment: function(frm, cdt, cdn) {
		var d = locals[cdt][cdn];
		get_payment_mode_account(frm, d.mode_of_payment, function(account){
			frappe.model.set_value(cdt, cdn, 'account', account)
		})
	},
	amount:  function(frm, cdt, cdn) {
		paid_amount_calculation(frm, cdt, cdn);	
	}
});

var items_calculation = function(frm, cdt, cdn) {
	var total_amount_supp=0, total_amount_cust=0, total_amount_uatp = 0;

	$.each(frm.doc.items, function(i, row) {
		total_amount_supp = total_amount_supp + flt(row.supp_total_amount);
		total_amount_cust = total_amount_cust + flt(row.cust_total_amount);
		total_amount_uatp = total_amount_uatp + flt(row.uatp_amount);
	});
	frm.set_value("supp_grand_total", total_amount_supp);
	frm.set_value("cust_total_amount", total_amount_cust);
	frm.set_value("uatp_total_amount", total_amount_uatp);
	frm.set_value("discount_amount", flt(frm.doc.cust_total_amount) * flt(frm.doc.discount_percent) / 100);
	frm.set_value("cust_grand_total", flt(frm.doc.cust_total_amount) - flt(frm.doc.discount_amount));
	frm.set_value("uatp_grand_total", flt(frm.doc.cust_grand_total) - flt(frm.doc.supp_grand_total));
	frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
}

var get_payment_mode_account = function(frm, mode_of_payment, callback) {

	if(!frm.doc.company) {
		frappe.throw(__("Please select the Company first"));
	}

	if(!mode_of_payment) {
		return;
	}

	return  frappe.call({
		method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.get_bank_cash_account",
		args: {
			"mode_of_payment": mode_of_payment,
			"company": frm.doc.company
		},
		callback: function(r, rt) {
			if(r.message) {
				callback(r.message.account)
                        }
		}
	});
}


var paid_amount_calculation = function(frm, cdt, cdn) {
	var total_paid_amount=0;
	$.each(frm.doc.payments, function(i, row) {
		total_paid_amount = total_paid_amount + flt(row.amount);
	});
	frm.set_value("paid_amount", total_paid_amount);
	frm.set_value("outstanding_amount", flt(frm.doc.cust_grand_total) - flt(frm.doc.paid_amount));
}
