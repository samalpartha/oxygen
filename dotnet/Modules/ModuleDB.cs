﻿using CloudBeat.Oxygen.Models;
using log4net;
using System;
using System.Data.Odbc;

namespace CloudBeat.Oxygen.Modules
{
	public class ModuleDB : IModule
	{
        private static readonly ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        private string connString;

		ExecutionContext ctx;
		bool isInitialized = false;

		#region Argument Names
		const string ARG_CONN_STR = "db@connString";
		#endregion

        public ModuleDB()
        {
        }

        public CommandResult setConnectionString(string connString)
        {
            this.connString = connString;

            var result = new CommandResult();
            result.CommandName = "db.setConnectionString('" + connString + "');";
            result.StartTime = DateTime.UtcNow;
            result.IsSuccess = true;
            result.EndTime = DateTime.UtcNow;

            return result;
        }

        public CommandResult getScalar(string query)
        {
            var result = new CommandResult();
            try
            {
                result.CommandName = string.Format("db.getScalar(\"{0}\")", query);
                result.StartTime = DateTime.UtcNow;
                var conn = Connect();
                OdbcCommand cmd = new OdbcCommand(query, conn);
                var retVal = cmd.ExecuteScalar();
                conn.Close();
                result.ReturnValue = retVal;
                result.IsSuccess = true;
                result.EndTime = DateTime.UtcNow;
                
            }
            catch (Exception e)
            {
                result.IsSuccess = false;
                result.EndTime = DateTime.UtcNow;
                result.ErrorType = e.GetType().ToString();
                result.ErrorMessage = e.Message;
                result.ErrorDetails = e.StackTrace;
                string statusData = null;
                var status = GetStatusByException(e, out statusData);
                result.StatusText = status.ToString();
                result.StatusData = statusData;
            }
            return result;
        }

        public void executeNonQuery(string query)
        {
            var result = new CommandResult();
            try
            {
                result.CommandName = string.Format("db.executeNonQuery(\"{0}\")", query);
                result.StartTime = DateTime.UtcNow;
                var conn = Connect();
                OdbcCommand cmd = new OdbcCommand(query, conn);
                cmd.ExecuteNonQuery();
                conn.Close();
                result.IsSuccess = true;
                result.EndTime = DateTime.UtcNow;
            }
            catch (Exception e)
            {
                result.IsSuccess = false;
                result.EndTime = DateTime.UtcNow;
                result.ErrorType = e.GetType().ToString();
                result.ErrorMessage = e.Message;
                result.ErrorDetails = e.StackTrace;
                string statusData = null;
                var status = GetStatusByException(e, out statusData);
                result.StatusText = status.ToString();
                result.StatusData = statusData;
            }
        }

        private OdbcConnection Connect()
        {
            try
            {
                OdbcConnection conn = new OdbcConnection(connString);
                conn.Open();
                return conn;
            }
            catch (Exception e)
            {
                throw new OxDBConnectionException(e.Message, e);
            }
        }

		public bool Initialize(System.Collections.Generic.Dictionary<string, string> args, ExecutionContext ctx)
		{
			this.ctx = ctx;

			if (args.ContainsKey(ARG_CONN_STR))
				connString = args[ARG_CONN_STR];

			isInitialized = true;

			return true;
		}

		public bool Dispose()
		{
			return true;
		}

		public bool IsInitialized
		{
			get { return isInitialized; }
		}

		public object IterationStarted()
		{
			return null;
		}

		public object IterationEnded()
		{
			return null;
		}

		public string Name
		{
			get { return "DB"; }
		}

        private CheckResultStatus GetStatusByException(Exception e, out string moreInfo)
        {
            var type = e.GetType();
            moreInfo = null;

            if (type == typeof(OxDBConnectionException))
            {
                moreInfo = e.Message;
                return CheckResultStatus.DB_CONNECTION;
            }
            else if (type == typeof(OdbcException)) 
            {
                moreInfo = e.Message;
                return CheckResultStatus.DB_QUERY;
            }
            else
            {
                log.Error("Unknown exception. Needs checking!!!", e);
                moreInfo = e.Message;
                return CheckResultStatus.UNKNOWN_ERROR;
            }
        }
	}
}