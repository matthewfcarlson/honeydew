/**
 * Tests for the util functions
 */
import * as Utils from '../functions/_utils';

describe('utils tests', () => {
    test('responses', async () => {
        expect(Utils.ResponseJsonBadRequest("test message")).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonMissingData()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonNotFound()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonServerError({ data: false })).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonAccessDenied()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonDebugOnly()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonNotImplementedYet()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonMethodNotAllowed()).toBeInstanceOf(Response);
        expect(Utils.ResponseJsonOk()).toBeInstanceOf(Response);
        const default_request = {
            url: "https://google.com"
        }
        const redirect = Utils.ResponseRedirect(default_request as Request, "honeydew.matthewc.dev");
        expect(redirect).toBeInstanceOf(Response);
    });

    test('cookies', async () => {

        const default_response = Utils.ResponseJsonOk();
        Utils.setCookie(default_response, "TEST", "KEY");
        expect(default_response.headers.get("Set-Cookie")).toContain("TEST");
        Utils.deleteCookie(default_response, "TEST");
        expect(default_response.headers.get("Set-Cookie")).toContain("TEST=deleted");
    });

    test('date', async () => {
        const timestamp = Utils.getJulianDate();
        expect(timestamp).toBeGreaterThan(2459986); // the number of days when this function was written
        // Give that this keeps track of days not seconds
        // it likely doesn't make any sense to try and delay and wait for the timer to go up
        expect(Utils.parseISO8601ToMinutes("PT1H30M10.5S")).toBe(91); // 1 hour, 30 minutes, 10.5 seconds
        expect(Utils.parseISO8601ToMinutes("P1D")).toBe(60*24); // 1 one day
        expect(Utils.parseISO8601ToMinutes("PT3H15M")).toBe(60*3+15); // 3 hours, 15 minutes

        // try to handle unstructured time
        expect(Utils.parseUnstructuredTimeToMinutes("3¼ hours on high")).toBe(3.25*60)
        expect(Utils.parseUnstructuredTimeToMinutes("43 minutes")).toBe(43)
        expect(Utils.parseUnstructuredTimeToMinutes("43 minutes, plus 10 minutes for dancing")).toBe(53)
        expect(Utils.parseUnstructuredTimeToMinutes("3 to 4 hours")).toBe(4*60)
    });
});
