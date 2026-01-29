import React from 'react';

const AccountDeletion = () => {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Account Deletion – Brain Coins
        </h1>
        
        <p className="text-gray-600 mb-8 text-center">
          This page explains how users can request deletion of their Brain Coins account and associated data.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            How to request account deletion:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Send an email to: <a href="mailto:jaamyy@gmail.com" className="font-semibold underline hover:text-blue-600">jaamyy@gmail.com</a></li>
            <li>Use the subject line: "Account Deletion Request – Brain Coins"</li>
            <li>Include the registered phone number used to sign in to the Brain Coins app</li>
          </ol>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
          <h2 className="text-xl font-semibold text-red-900 mb-4">
            Data that will be deleted:
          </h2>
          <ul className="list-disc list-inside space-y-1 text-red-800">
            <li>Phone number</li>
            <li>User profile data</li>
            <li>Learning progress and quiz history</li>
            <li>App usage records</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">
            Data that may be retained:
          </h2>
          <p className="text-yellow-800">
            Transaction and subscription records required for legal, accounting, or tax purposes (retained up to 7 years)
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-gray-700 font-medium">
            Account deletion requests are processed within 7 working days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletion;
