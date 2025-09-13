import React from "react";
import { NavLink } from "react-router-dom";

function ResetPassword() {
    return (
        <div className="flex min-h-screen">
            <div className="w-1/2 bg-gradient-to-br from-yellow-400 to-yellow-500 relative overflow-hidden">
                <div className="absolute inset-0 p-12 flex flex-col justify-center">
                    <h1 className="text-white text-4xl font-bold mb-8">StudAI</h1>
                    <h2 className="text-gray-800 text-3xl font-bold leading-tight">
                        Forgot your<br />
                        password?<br />
                        Don't worry!
                    </h2>
                </div>
                <div className="absolute top-16 right-16">
                    <div className="w-8 h-8 bg-red-500 rounded-full opacity-80"></div>
                </div>
                <div className="absolute top-32 right-32">
                    <div className="w-6 h-6 bg-red-400 rounded-full opacity-60"></div>
                </div>
                <div className="absolute bottom-1/3 left-16">
                    <div className="w-4 h-16 bg-red-500 rounded-full transform rotate-12"></div>
                </div>
                <div className="absolute bottom-16 right-16 transform rotate-12">
                    <div className="w-32 h-40 bg-white rounded-lg shadow-lg"></div>
                </div>
                <div className="absolute bottom-24 right-32 transform -rotate-6">
                    <div className="w-28 h-36 bg-red-500 rounded-lg shadow-lg"></div>
                </div>
            </div>

            <div className="w-1/2 bg-white flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-semibold mb-3">Reset your password</h2>
                    <p className="text-gray-600 mb-6">
                        Enter the email you signed up with. We'll send you a link to log in
                        and reset your password.
                    </p>

                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                placeholder="user@email.com"
                                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0"
                            />
                        </div>

                        <NavLink
                            to="/login"
                            className="block text-right text-sm text-blue-600 hover:text-blue-700 mb-3"
                        >
                            Log In
                        </NavLink>

                        <button
                            type="submit"
                            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2"
                        >
                            Send link
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
