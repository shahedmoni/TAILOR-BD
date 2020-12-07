﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace TailorBD.Access_Authority.Invoice
{
    public partial class Print_Invoice : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {

            if (string.IsNullOrEmpty(Request.QueryString["InstitutionID"]) && string.IsNullOrEmpty(Request.QueryString["InvoiceID"]))
            {
                Response.Redirect("Pay_Invoice.aspx");
            }
        }
    }
}