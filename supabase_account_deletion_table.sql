-- Account Deletion Requests Table
-- This table tracks all account deletion requests for Brain Coins

CREATE TABLE account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    processed_date TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(255),
    notes TEXT,
    user_data_deleted BOOLEAN DEFAULT FALSE,
    retention_data_kept BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_account_deletion_requests_phone_number ON account_deletion_requests(phone_number);
CREATE INDEX idx_account_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX idx_account_deletion_requests_request_date ON account_deletion_requests(request_date);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_account_deletion_requests_updated_at 
    BEFORE UPDATE ON account_deletion_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Only allow authenticated users to insert/update
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own deletion requests
CREATE POLICY "Users can insert account deletion requests" ON account_deletion_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow service role to read all deletion requests
CREATE POLICY "Service role can read all deletion requests" ON account_deletion_requests
    FOR SELECT USING (auth.role() = 'service_role');

-- Policy: Allow service role to update all deletion requests
CREATE POLICY "Service role can update deletion requests" ON account_deletion_requests
    FOR UPDATE USING (auth.role() = 'service_role');

-- Policy: Allow service role to delete deletion requests
CREATE POLICY "Service role can delete deletion requests" ON account_deletion_requests
    FOR DELETE USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE account_deletion_requests IS 'Tracks all account deletion requests for Brain Coins app';
COMMENT ON COLUMN account_deletion_requests.id IS 'Unique identifier for the deletion request';
COMMENT ON COLUMN account_deletion_requests.phone_number IS 'Phone number of the user requesting deletion';
COMMENT ON COLUMN account_deletion_requests.email IS 'Email address of the user requesting deletion';
COMMENT ON COLUMN account_deletion_requests.request_date IS 'Date when the deletion request was made';
COMMENT ON COLUMN account_deletion_requests.status IS 'Current status: pending, processing, completed, rejected';
COMMENT ON COLUMN account_deletion_requests.processed_date IS 'Date when the request was processed';
COMMENT ON COLUMN account_deletion_requests.processed_by IS 'Admin/processor who handled the request';
COMMENT ON COLUMN account_deletion_requests.notes IS 'Additional notes about the deletion request';
COMMENT ON COLUMN account_deletion_requests.user_data_deleted IS 'Whether user data has been deleted';
COMMENT ON COLUMN account_deletion_requests.retention_data_kept IS 'Whether retention data (legal/accounting) is kept';
